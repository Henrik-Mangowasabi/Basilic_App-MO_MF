import { authenticate } from "../shopify.server";

/**
 * Route API qui exécute le scan du thème et stream la progression réelle (0-100).
 * GET /app/api/mf-scan → stream NDJSON { progress: number } puis { progress: 100, results: string[] }
 */
export const loader = async ({ request }: { request: Request }) => {
    const { admin } = await authenticate.admin(request);
    const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
    const shopJson = await shopRes.json();
    const domain = shopJson.data?.shop?.myshopifyDomain;
    if (!domain) return new Response(JSON.stringify({ error: "Shop non trouvé" }), { status: 400 });

    const themesRes = await admin.graphql(`{ themes(first: 1, roles: [MAIN]) { nodes { id } } }`);
    const themesData = await themesRes.json();
    const activeThemeId = themesData.data?.themes?.nodes?.[0]?.id.split("/").pop();
    if (!activeThemeId) return new Response(JSON.stringify({ error: "Thème non trouvé" }), { status: 400 });

    const { session } = await authenticate.admin(request);
    const assetsRes = await fetch(
        `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
        { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
    );
    const assetsJson = await assetsRes.json();
    const allAssets = assetsJson.assets || [];
    const scannableExtensions = [".liquid", ".js", ".json", ".css", ".scss", ".ts", ".tsx", ".jsx"];
    const scannableAssets = allAssets.filter(
        (a: { key: string }) =>
            scannableExtensions.some((ext: string) => a.key.endsWith(ext)) &&
            !a.key.includes("node_modules") &&
            !a.key.includes(".min.")
    );

    const query = (ot: string, cursor: string | null) =>
        `query getMetafieldDefinitions($cursor: String, $ownerType: MetafieldOwnerType!) { metafieldDefinitions(ownerType: $ownerType, first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id name key namespace type { name } } } }`;
    const ots = ["PRODUCT", "PRODUCTVARIANT", "COLLECTION", "CUSTOMER", "ORDER", "DRAFTORDER", "COMPANY", "LOCATION", "MARKET", "PAGE", "BLOG", "ARTICLE", "SHOP"];
    const results = await Promise.all(
        ots.map(async (ot) => {
            let allNodes: any[] = [];
            let hasNextPage = true;
            let cursor: string | null = null;
            while (hasNextPage) {
                const r = await admin.graphql(query(ot, cursor), { variables: { cursor, ownerType: ot } });
                const j = await r.json();
                const data = j.data?.metafieldDefinitions;
                if (data?.nodes) allNodes = [...allNodes, ...data.nodes];
                hasNextPage = data?.pageInfo?.hasNextPage ?? false;
                cursor = data?.pageInfo?.endCursor ?? null;
                if (allNodes.length >= 10000) break;
            }
            return allNodes.map((n: any) => `${n.namespace}.${n.key}`);
        })
    );
    const allFullKeys = new Set<string>(results.flat());
    // OPTIMISATION: Augmenter la taille des batches pour moins de requêtes séquentielles
    const batchSize = 25;
    const totalBatches = Math.ceil(scannableAssets.length / batchSize) || 1;
    const metafieldsInCode = new Set<string>();

    const encoder = new TextEncoder();
    const sse = (data: object) => "data: " + JSON.stringify(data) + "\n\n";
    const stream = new ReadableStream({
        async start(controller) {
            try {
                controller.enqueue(encoder.encode(sse({ progress: 0 })));
                for (let i = 0; i < scannableAssets.length; i += batchSize) {
                    const batch = scannableAssets.slice(i, i + batchSize);
                    await Promise.all(
                        batch.map(async (asset: { key: string }) => {
                            try {
                                const contentRes = await fetch(
                                    `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`,
                                    { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
                                );
                                const contentJson = await contentRes.json();
                                const content = contentJson.asset?.value || "";
                                allFullKeys.forEach((fullKey) => {
                                    const [namespace, key] = fullKey.split(".");
                                    if (
                                        content.includes(fullKey) ||
                                        content.includes(`"${fullKey}"`) ||
                                        content.includes(`'${fullKey}'`) ||
                                        content.includes(`metafields.${namespace}.${key}`) ||
                                        content.includes(`metafields['${fullKey}']`) ||
                                        content.includes(`metafields["${fullKey}"]`) ||
                                        content.includes(`metafields.${fullKey}`) ||
                                        content.includes(`['${fullKey}']`) ||
                                        content.includes(`["${fullKey}"]`)
                                    ) {
                                        metafieldsInCode.add(fullKey);
                                        return;
                                    }
                                    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                    if (new RegExp(`metafields\\.${esc(namespace)}\\.${esc(key)}`, "i").test(content)) metafieldsInCode.add(fullKey);
                                    else if (new RegExp(`metafields\\s*\\[\\s*['"]${esc(fullKey)}['"]\\s*\\]`, "i").test(content)) metafieldsInCode.add(fullKey);
                                    else if (new RegExp(`['"]${esc(fullKey)}['"]\\s*:`, "i").test(content)) metafieldsInCode.add(fullKey);
                                });
                            } catch (_e) {
                                // ignore
                            }
                        })
                    );
                    const batchIndex = Math.floor(i / batchSize) + 1;
                    const progress = Math.min(99, Math.round((batchIndex / totalBatches) * 100));
                    controller.enqueue(encoder.encode(sse({ progress })));
                }
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(metafieldsInCode) })));
            } catch (e) {
                controller.enqueue(encoder.encode(sse({ progress: 100, results: [], error: String(e) })));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store, no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
};
