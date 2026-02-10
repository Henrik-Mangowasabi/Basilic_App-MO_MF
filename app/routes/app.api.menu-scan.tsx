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

    // Récupérer les menus via GraphQL
    let menuHandles: string[] = [];
    let cursor: string | null = null;
    for (;;) {
        const res = await admin.graphql(
            `query getMenus($cursor: String) {
                menus(first: 250, after: $cursor) {
                    pageInfo { hasNextPage endCursor }
                    nodes { handle }
                }
            }`,
            { variables: { cursor } }
        );
        const json: any = await res.json();
        const data = json.data?.menus;
        if (data?.nodes) menuHandles.push(...data.nodes.map((m: { handle: string }) => m.handle));
        if (!data?.pageInfo?.hasNextPage) break;
        cursor = data.pageInfo.endCursor;
    }

    const encoder = new TextEncoder();
    const sse = (data: object) => "data: " + JSON.stringify(data) + "\n\n";
    const menusInCode = new Set<string>();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log(`[MENU-SCAN] Starting scan. Domain: ${domain}, Theme ID: ${activeThemeId}`);
                controller.enqueue(encoder.encode(sse({ progress: 0 })));

                // Récupération des assets avec retry
                const allAssets = await fetchAssetsList(domain, activeThemeId, session.accessToken!);
                const scannableAssets = allAssets.filter(a =>
                    (a.key.endsWith('.liquid') || a.key.endsWith('.json')) && !a.key.includes('node_modules')
                );
                console.log(`[MENU-SCAN] Total menus: ${menuHandles.length}, Total assets: ${allAssets.length}, Scannable: ${scannableAssets.length}`);

                // Scan avec retry et backoff
                const assetsWithContent = await scanAssetsInBatches(
                    scannableAssets, domain, activeThemeId, session.accessToken!,
                    (scanned, total) => {
                        const progress = Math.min(99, Math.round((scanned / total) * 100));
                        controller.enqueue(encoder.encode(sse({ progress })));
                    },
                    2, 200
                );

                // Analyse du contenu
                for (const { content } of assetsWithContent) {
                    menuHandles.forEach((handle) => {
                        if (content.includes(`"${handle}"`) || content.includes(`'${handle}'`) || content.includes(`.${handle}`)) {
                            menusInCode.add(handle);
                        }
                    });
                }

                console.log(`[MENU-SCAN] Scan complete. Assets with content: ${assetsWithContent.length}. Menus found: ${menusInCode.size}`);
                console.log(`[MENU-SCAN] Results:`, Array.from(menusInCode).slice(0, 10));
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(menusInCode) })));
            } catch (e) {
                console.error(`[MENU-SCAN] Fatal error:`, e);
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(menusInCode), error: String(e) })));
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
