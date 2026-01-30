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
                controller.enqueue(encoder.encode(sse({ progress: 1, message: "Initialisation..." })));
                
                const mfKeys: string[] = [];
                const ownerTypes = ["PRODUCT", "PRODUCTVARIANT", "COLLECTION", "CUSTOMER", "ORDER", "DRAFTORDER", "COMPANY", "LOCATION", "MARKET", "PAGE", "BLOG", "ARTICLE", "SHOP"];
                
                // 1. Récupération des clés à l'intérieur du stream pour éviter le timeout
                for (let idx = 0; idx < ownerTypes.length; idx++) {
                    const ownerType = ownerTypes[idx];
                    let cursor: string | null = null;
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
                                });
                            }
                            if (!data?.pageInfo?.hasNextPage) break;
                            cursor = data.pageInfo.endCursor;
                        }
                    } catch (e) {}
                    const keyProgress = Math.round(((idx + 1) / ownerTypes.length) * 10); // 10% max pour les clés
                    controller.enqueue(encoder.encode(sse({ progress: keyProgress, message: `Récupération des clés ${ownerType}...` })));
                }

                // 2. Récupération des assets
                const assetsRes = await fetch(`https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`, {
                    headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                });
                const assetsJson = await assetsRes.json();
                const allAssets = (assetsJson.assets || []) as { key: string }[];
                const scannableAssets = allAssets.filter(a => 
                    (a.key.endsWith('.liquid') || a.key.endsWith('.json')) && !a.key.includes('node_modules')
                );

                const mfInCode = new Set<string>();
                const batchSize = 10;

                // 3. Scan des assets
                for (let i = 0; i < scannableAssets.length; i += batchSize) {
                    const batch = scannableAssets.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (asset) => {
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
                                    await new Promise(r => setTimeout(r, 500));
                                } else { break; }
                            } catch (e) {
                                await new Promise(r => setTimeout(r, 200));
                            }
                            attempts++;
                        }

                        if (!content) return;

                        mfKeys.forEach((fullKey) => {
                            if (mfInCode.has(fullKey)) return;
                            const parts = fullKey.split('.');
                            const key = parts[parts.length - 1];
                            
                            // Détection ultra-large : clé complète, clé seule, avec ou sans filtres Liquid
                            if (content.includes(fullKey) || 
                                content.includes(`.${key}`) || 
                                content.includes(`"${key}"`) || 
                                content.includes(`'${key}'`) || 
                                content.includes(`["${key}"]`) ||
                                content.includes(`['${key}']`)) {
                                mfInCode.add(fullKey);
                            }
                        });
                    }));

                    const scanProgress = 10 + Math.round(((i + batch.length) / scannableAssets.length) * 90);
                    controller.enqueue(encoder.encode(sse({ progress: scanProgress })));
                }

                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(mfInCode) })));
            } catch (e) {
                controller.enqueue(encoder.encode(sse({ progress: 100, results: [] })));
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
