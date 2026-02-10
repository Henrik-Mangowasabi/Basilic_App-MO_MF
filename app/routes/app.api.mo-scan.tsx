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

    const moTypes: string[] = [];
    let moCursor: string | null = null;
    try {
        for (;;) {
            const r: Response = await admin.graphql(
                `query getMetaobjectTypes($cursor: String) {
                    metaobjectDefinitions(first: 250, after: $cursor) {
                        pageInfo { hasNextPage endCursor }
                        nodes { type }
                    }
                }`,
                { variables: { cursor: moCursor } }
            );
            const j: { data?: { metaobjectDefinitions?: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: { type: string }[] } } } = await r.json();
            const data: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: { type: string }[] } | undefined = j.data?.metaobjectDefinitions;
            if (data?.nodes) moTypes.push(...data.nodes.map((n: { type: string }) => n.type));
            if (!data?.pageInfo?.hasNextPage) break;
            moCursor = data.pageInfo.endCursor;
        }
    } catch (e) {}

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
    const sse = (data: any) => `data: ${JSON.stringify(data)}\n\n`;
    const metaobjectsInCode = new Set<string>();

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

                            moTypes.forEach(type => {
                                if (metaobjectsInCode.has(type)) return;
                                // Détection robuste : guillemets, après un point, ou entre crochets, avec word boundaries
                                const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const patterns = [
                                    `"${escapedType}"`,
                                    `'${escapedType}'`,
                                    `\\.${escapedType}\\b`,
                                    `\\['${escapedType}'\\]`,
                                    `\\["${escapedType}"\\]`,
                                ];
                                const regex = new RegExp(patterns.join('|'), 'i');
                                if (regex.test(content)) {
                                    metaobjectsInCode.add(type);
                                }
                            });
                        } catch (err) {}
                    }));
                    const progress = Math.min(99, Math.round(((i + batch.length) / scannableAssets.length) * 100));
                    controller.enqueue(encoder.encode(sse({ progress })));
                    await new Promise(r => setTimeout(r, 50));
                }
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(metaobjectsInCode) })));
            } catch (e) {
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(metaobjectsInCode) })));
            } finally {
                controller.close();
            }
        }
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
