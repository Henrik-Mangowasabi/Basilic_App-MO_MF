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
    const menusInCode = new Set<string>();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log(`[MENU-SCAN] Starting scan. Domain: ${domain}, Theme ID: ${activeThemeId}`);
                console.log(`[MENU-SCAN] Total menus: ${menuHandles.length}, Total assets: ${allAssets.length}, Scannable: ${scannableAssets.length}`);
                controller.enqueue(encoder.encode(sse({ progress: 0 })));
                const batchSize = 10;
                let assetsWithContent = 0;
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
                            assetsWithContent++;

                            menuHandles.forEach((handle) => {
                                // Recherche large : guillemets ou après un point
                                if (content.includes(`"${handle}"`) || content.includes(`'${handle}'`) || content.includes(`.${handle}`)) {
                                    menusInCode.add(handle);
                                }
                            });
                        } catch (e) {}
                    }));
                    const progress = Math.min(99, Math.round(((i + batch.length) / scannableAssets.length) * 100));
                    controller.enqueue(encoder.encode(sse({ progress })));
                    await new Promise(r => setTimeout(r, 50));
                }
                console.log(`[MENU-SCAN] Scan complete. Assets with content: ${assetsWithContent}. Menus found: ${menusInCode.size}`);
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
