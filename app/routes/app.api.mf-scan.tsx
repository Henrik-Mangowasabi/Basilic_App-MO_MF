import { authenticate } from "../shopify.server";

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

                const mfKeys: string[] = [];
                const ownerTypes = ["PRODUCT", "PRODUCTVARIANT", "COLLECTION", "CUSTOMER", "ORDER", "DRAFTORDER", "COMPANY", "LOCATION", "MARKET", "PAGE", "BLOG", "ARTICLE", "SHOP"];

                // 1. Récupération des clés à l'intérieur du stream pour éviter le timeout
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

                // 2. Récupération des assets
                const assetsRes = await fetch(`https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`, {
                    headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                });
                if (!assetsRes.ok) {
                    console.error(`[MF-SCAN] Failed to fetch assets: ${assetsRes.status}`);
                    throw new Error(`Assets API returned ${assetsRes.status}`);
                }
                const assetsJson = await assetsRes.json();
                const allAssets = (assetsJson.assets || []) as { key: string }[];
                const scannableAssets = allAssets.filter(a =>
                    (a.key.endsWith('.liquid') || a.key.endsWith('.json')) && !a.key.includes('node_modules')
                );
                console.log(`[MF-SCAN] Total assets: ${allAssets.length}, Scannable: ${scannableAssets.length}`);

                const mfInCode = new Set<string>();
                const batchSize = 1;  // Réduit à 1 - une seule requête à la fois pour éviter rate limit
                let assetsWithContent = 0;

                // 3. Scan des assets
                for (let i = 0; i < scannableAssets.length; i += batchSize) {
                    const batch = scannableAssets.slice(i, i + batchSize);
                    // Sequential processing instead of Promise.all for batch size 1
                    for (const asset of batch) {
                        let attempts = 0;
                        const maxAttempts = 3;
                        let content = "";

                        while (attempts < maxAttempts) {
                            try {
                                const url = `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                                const res = await fetch(url, {
                                    headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                                });
                                if (res.ok) {
                                    const json = await res.json();
                                    content = json.asset?.value || "";
                                    break;
                                } else if (res.status === 429) {
                                    // Exponential backoff: 2s, 4s, 8s
                                    const backoffMs = Math.pow(2, attempts + 1) * 1000;
                                    await new Promise(r => setTimeout(r, backoffMs));
                                } else { break; }
                            } catch (e) {
                                await new Promise(r => setTimeout(r, 200));
                            }
                            attempts++;
                        }

                        if (!content) {
                            continue;
                        }
                        assetsWithContent++;

                        mfKeys.forEach((fullKey) => {
                            if (mfInCode.has(fullKey)) return;
                            const parts = fullKey.split('.');
                            const key = parts[parts.length - 1];
                            const namespace = parts[0];

                            // Escape regex special characters
                            const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const escapedFullKey = escapeRegex(fullKey);
                            const escapedKey = escapeRegex(key);
                            const escapedNamespace = escapeRegex(namespace);

                            // Détection robuste avec regex pour éviter les faux positifs
                            const patterns = [
                                escapedFullKey,  // clé complète exacte
                                `metafields\\.${escapedFullKey}`,  // metafields.namespace.key
                                `metafields\\.${escapedNamespace}\\.${escapedKey}`,  // pattern complet
                                `\\["${escapedKey}"\\]`,  // ["key"]
                                `\\['${escapedKey}'\\]`,  // ['key']
                                `metafields\\.get\\('${escapedFullKey}'`,  // metafields.get('...')
                                `metafields\\.${escapedKey}\\b`,  // word boundary après key
                            ];

                            const regex = new RegExp(patterns.join('|'), 'i');
                            if (regex.test(content)) {
                                mfInCode.add(fullKey);
                            }
                        });
                    }

                    const scanProgress = 10 + Math.round(((i + batch.length) / scannableAssets.length) * 90);
                    controller.enqueue(encoder.encode(sse({ progress: scanProgress, status: `Scanned ${i + batch.length}/${scannableAssets.length} files...` })));
                    // Délai entre chaque asset pour respecter rate limits Shopify (sequential mode)
                    await new Promise(r => setTimeout(r, 100));
                }

                console.log(`[MF-SCAN] Scan complete. Assets with content: ${assetsWithContent}. Metafields found in code: ${mfInCode.size}`);
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
