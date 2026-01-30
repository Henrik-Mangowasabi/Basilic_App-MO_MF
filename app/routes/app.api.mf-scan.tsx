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

    const mfKeys: string[] = [];
    const ownerTypes = ["PRODUCT", "VARIANT", "COLLECTION", "CUSTOMER", "ORDER", "DRAFTORDER", "COMPANY", "LOCATION", "MARKET", "PAGE", "BLOG", "ARTICLE", "SHOP"];
    
    for (const ownerType of ownerTypes) {
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
    }

    const assetsRes = await fetch(
        `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
        { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
    );
    const assetsJson = await assetsRes.json();
    const allAssets = (assetsJson.assets || []) as { key: string }[];
    const scannableAssets = allAssets.filter(a => 
        (a.key.endsWith('.liquid') || a.key.endsWith('.json')) &&
        !a.key.includes('node_modules')
    );

    const encoder = new TextEncoder();
    const sse = (data: object) => "data: " + JSON.stringify(data) + "\n\n";
    const mfInCode = new Set<string>();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                controller.enqueue(encoder.encode(sse({ progress: 0 })));
                const batchSize = 10;
                for (let i = 0; i < scannableAssets.length; i += batchSize) {
                    const batch = scannableAssets.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (asset) => {
                        try {
                            const url = `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                            const res = await fetch(url, {
                                headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                            });
                            const json = await res.json();
                            const content = json.asset?.value || "";
                            if (!content) return;

                            mfKeys.forEach((fullKey) => {
                                if (mfInCode.has(fullKey)) return;
                                const [ns, key] = fullKey.split('.');
                                // Recherche ultra-large : namespace.key, clé entre guillemets, ou après un point
                                if (content.includes(fullKey) || 
                                    content.includes(`"${key}"`) || 
                                    content.includes(`'${key}'`) || 
                                    content.includes(`.${key}`)) {
                                    mfInCode.add(fullKey);
                                }
                            });
                        } catch (e) {}
                    }));
                    const progress = Math.min(99, Math.round(((i + batch.length) / scannableAssets.length) * 100));
                    controller.enqueue(encoder.encode(sse({ progress })));
                    await new Promise(r => setTimeout(r, 50));
                }
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(mfInCode) })));
            } catch (e) {
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(mfInCode) })));
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
