import { authenticate } from "../shopify.server";

/**
 * Route API : scan du thème pour les types metaobjects, stream progression 0-100.
 * GET /app/api/mo-scan → NDJSON { progress: number } puis { progress: 100, results: string[] }
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

    let moTypes: string[] = [];
    let moCursor: string | null = null;
    for (;;) {
        const r = await admin.graphql(
            `query getMetaobjectTypes($cursor: String) { metaobjectDefinitions(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { type } } }`,
            { variables: { cursor: moCursor } }
        );
        const j = await r.json();
        const data = j.data?.metaobjectDefinitions;
        if (data?.nodes) moTypes.push(...data.nodes.map((n: { type: string }) => n.type));
        if (!data?.pageInfo?.hasNextPage) break;
        moCursor = data.pageInfo.endCursor;
        if (moTypes.length >= 500) break;
    }

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

    // OPTIMISATION: Augmenter la taille des batches pour moins de requêtes séquentielles
    const batchSize = 25;
    const totalBatches = Math.ceil(scannableAssets.length / batchSize) || 1;
    const metaobjectsInCode = new Set<string>();
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
                                moTypes.forEach((type: string) => {
                                    const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                    if (
                                        content.includes(`metaobjects.${type}`) ||
                                        content.includes(`metaobjects["${type}"]`) ||
                                        content.includes(`metaobjects['${type}']`) ||
                                        content.includes(`metaobject.${type}`) ||
                                        new RegExp(`metaobjects\\s*\\[\\s*['"]${escaped}['"]\\s*\\]`).test(content)
                                    ) {
                                        metaobjectsInCode.add(type);
                                    }
                                });
                            } catch {
                                // ignore
                            }
                        })
                    );
                    const batchIndex = Math.floor(i / batchSize) + 1;
                    const progress = Math.min(99, Math.round((batchIndex / totalBatches) * 100));
                    controller.enqueue(encoder.encode(sse({ progress })));
                }
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(metaobjectsInCode) })));
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
