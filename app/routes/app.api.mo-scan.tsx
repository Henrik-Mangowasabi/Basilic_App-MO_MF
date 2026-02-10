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

    // Récupérer les types de metaobjects via GraphQL
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
            const j: any = await r.json();
            const data = j.data?.metaobjectDefinitions;
            if (data?.nodes) moTypes.push(...data.nodes.map((n: { type: string }) => n.type));
            if (!data?.pageInfo?.hasNextPage) break;
            moCursor = data.pageInfo.endCursor;
        }
    } catch (e) {
        console.error(`[MO-SCAN] Error fetching metaobject types:`, e);
    }

    const encoder = new TextEncoder();
    const sse = (data: any) => `data: ${JSON.stringify(data)}\n\n`;
    const metaobjectsInCode = new Set<string>();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log(`[MO-SCAN] Starting metaobject scan. Domain: ${domain}, Theme ID: ${activeThemeId}`);
                console.log(`[MO-SCAN] Metaobject types fetched: ${moTypes.length}`, moTypes.slice(0, 5));
                controller.enqueue(encoder.encode(sse({ progress: 0 })));

                // Récupération des assets avec retry
                const allAssets = await fetchAssetsList(domain, activeThemeId, session.accessToken!);
                const scannableAssets = allAssets.filter(a =>
                    (a.key.endsWith('.liquid') || a.key.endsWith('.json')) && !a.key.includes('node_modules')
                );
                console.log(`[MO-SCAN] Total assets: ${allAssets.length}, Scannable: ${scannableAssets.length}`);

                // Scan avec retry et backoff
                const assetsWithContent = await scanAssetsInBatches(
                    scannableAssets, domain, activeThemeId, session.accessToken!,
                    (scanned, total) => {
                        const progress = Math.min(99, Math.round((scanned / total) * 100));
                        controller.enqueue(encoder.encode(sse({ progress, status: `Scanned ${scanned}/${total}...` })));
                    },
                    2, 200
                );

                // Analyse du contenu
                for (const { content } of assetsWithContent) {
                    moTypes.forEach(type => {
                        if (metaobjectsInCode.has(type)) return;
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
                }

                console.log(`[MO-SCAN] Scan complete. Assets with content: ${assetsWithContent.length}. Metaobjects found: ${metaobjectsInCode.size}`);
                console.log(`[MO-SCAN] Results:`, Array.from(metaobjectsInCode).slice(0, 10));
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(metaobjectsInCode) })));
            } catch (e) {
                console.error(`[MO-SCAN] Fatal error:`, e);
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(metaobjectsInCode), error: String(e) })));
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
