import { authenticate } from "../shopify.server";
import { fetchAssetsList, scanAssetsInBatches } from "../utils/theme-assets.server";

export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
    const shopJson = await shopRes.json();
    const domain = shopJson.data?.shop?.myshopifyDomain;
    if (!domain) return new Response(JSON.stringify({ error: "Shop non trouvé" }), { status: 400 });

    const themesRes = await admin.graphql(`{ themes(first: 5, roles: [MAIN]) { nodes { id } } }`);
    const themesData = await themesRes.json();
    const activeThemeId = themesData.data?.themes?.nodes?.[0]?.id.split("/").pop();
    if (!activeThemeId) return new Response(JSON.stringify({ error: "Thème actif non trouvé" }), { status: 400 });

    const encoder = new TextEncoder();
    const sse = (data: any) => `data: ${JSON.stringify(data)}\n\n`;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log(`[MF-SCAN] Starting scan. Domain: ${domain}, Theme ID: ${activeThemeId}`);
                controller.enqueue(encoder.encode(sse({ progress: 1, message: "Initialisation..." })));

                // 1. Récupération des clés metafield
                const mfKeys: string[] = [];
                const ownerTypes = ["PRODUCT", "PRODUCTVARIANT", "COLLECTION", "CUSTOMER", "ORDER", "DRAFTORDER", "COMPANY", "LOCATION", "MARKET", "PAGE", "BLOG", "ARTICLE", "SHOP"];

                for (let idx = 0; idx < ownerTypes.length; idx++) {
                    const ownerType = ownerTypes[idx];
                    let cursor: string | null = null;
                    let keysForType = 0;
                    try {
                        for (;;) {
                            const res = await admin.graphql(
                                `query getKeys($ownerType: MetafieldOwnerType!, $cursor: String) {
                                    metafieldDefinitions(first: 250, ownerType: $ownerType, after: $cursor) {
                                        pageInfo { hasNextPage endCursor }
                                        nodes { namespace key }
                                    }
                                }`,
                                { variables: { ownerType, cursor } }
                            );
                            const json: any = await res.json();
                            const data = json.data?.metafieldDefinitions;
                            if (data?.nodes) {
                                data.nodes.forEach((n: { namespace: string; key: string }) => {
                                    mfKeys.push(`${n.namespace}.${n.key}`);
                                    keysForType++;
                                });
                            }
                            if (!data?.pageInfo?.hasNextPage) break;
                            cursor = data.pageInfo.endCursor;
                        }
                    } catch (e) {
                        console.error(`[MF-SCAN] Error fetching keys for ${ownerType}:`, e);
                    }
                    console.log(`[MF-SCAN] Owner type ${ownerType}: ${keysForType} keys. Total so far: ${mfKeys.length}`);
                    const keyProgress = Math.round(((idx + 1) / ownerTypes.length) * 10);
                    controller.enqueue(encoder.encode(sse({ progress: keyProgress, message: `Récupération des clés ${ownerType}... (${mfKeys.length} total)` })));
                }
                console.log(`[MF-SCAN] Total metafield keys fetched: ${mfKeys.length}`);

                // 2. Récupération des assets avec retry
                const allAssets = await fetchAssetsList(domain, activeThemeId, session.accessToken!);
                const scannableAssets = allAssets.filter(a =>
                    (a.key.endsWith('.liquid') || a.key.endsWith('.json')) && !a.key.includes('node_modules')
                );
                console.log(`[MF-SCAN] Total assets: ${allAssets.length}, Scannable: ${scannableAssets.length}`);

                // 3. Scan des assets avec retry et backoff
                const mfInCode = new Set<string>();

                const assetsWithContent = await scanAssetsInBatches(
                    scannableAssets, domain, activeThemeId, session.accessToken!,
                    (scanned, total) => {
                        const scanProgress = 10 + Math.round((scanned / total) * 90);
                        controller.enqueue(encoder.encode(sse({ progress: scanProgress, status: `Scanned ${scanned}/${total} files...` })));
                    },
                    2, 200
                );

                // 4. Analyse du contenu
                for (const { content } of assetsWithContent) {
                    mfKeys.forEach((fullKey) => {
                        if (mfInCode.has(fullKey)) return;
                        const parts = fullKey.split('.');
                        const key = parts[parts.length - 1];
                        const namespace = parts[0];

                        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const escapedFullKey = escapeRegex(fullKey);
                        const escapedKey = escapeRegex(key);
                        const escapedNamespace = escapeRegex(namespace);

                        const patterns = [
                            escapedFullKey,
                            `metafields\\.${escapedFullKey}`,
                            `metafields\\.${escapedNamespace}\\.${escapedKey}`,
                            `\\["${escapedKey}"\\]`,
                            `\\['${escapedKey}'\\]`,
                            `metafields\\.get\\('${escapedFullKey}'`,
                            `metafields\\.${escapedKey}\\b`,
                        ];

                        const regex = new RegExp(patterns.join('|'), 'i');
                        if (regex.test(content)) {
                            mfInCode.add(fullKey);
                        }
                    });
                }

                console.log(`[MF-SCAN] Scan complete. Assets with content: ${assetsWithContent.length}. Metafields found in code: ${mfInCode.size}`);
                console.log(`[MF-SCAN] Results:`, Array.from(mfInCode).slice(0, 10));
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(mfInCode) })));
            } catch (e) {
                console.error(`[MF-SCAN] Fatal error:`, e);
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
