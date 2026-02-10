import { authenticate } from "../shopify.server";
import { fetchAssetsList, scanAssetsInBatches } from "../utils/theme-assets.server";

/**
 * Route API : scan du thème pour les templates, stream progression 0-100.
 */
export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
    const shopJson = await shopRes.json();
    const domain = shopJson.data?.shop?.myshopifyDomain;
    if (!domain) return new Response(JSON.stringify({ error: "Shop non trouvé" }), { status: 400 });

    const themesRes = await admin.graphql(`{ themes(first: 10, roles: [MAIN]) { nodes { id } } }`);
    const themesData = await themesRes.json();
    const activeThemeId = themesData.data?.themes?.nodes?.[0]?.id.split("/").pop();
    if (!activeThemeId) return new Response(JSON.stringify({ error: "Thème actif non trouvé" }), { status: 400 });

    const encoder = new TextEncoder();
    const sse = (data: object) => "data: " + JSON.stringify(data) + "\n\n";
    const templatesInCode = new Set<string>();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log(`[TEMPLATE-SCAN] Starting scan. Domain: ${domain}, Theme ID: ${activeThemeId}`);
                controller.enqueue(encoder.encode(sse({ progress: 0 })));

                // 1. Lister les assets avec retry
                const allAssets = await fetchAssetsList(domain, activeThemeId, session.accessToken!);

                // Identifier les templates (ex: templates/product.custom.json)
                const templateSuffixes = allAssets
                    .filter((a: { key: string }) => a.key.startsWith('templates/') && a.key.endsWith('.json'))
                    .map((a: { key: string }) => {
                        const parts = a.key.replace('templates/', '').replace('.json', '').split('.');
                        return parts.length > 1 ? parts.slice(1).join('.') : null;
                    })
                    .filter(Boolean) as string[];

                // 2. Fichiers à scanner
                const scannableExtensions = [".liquid", ".js", ".json"];
                const scannableAssets = allAssets.filter(
                    (a: { key: string }) =>
                        scannableExtensions.some((ext: string) => a.key.endsWith(ext)) &&
                        !a.key.includes("node_modules") &&
                        !a.key.includes(".min.") &&
                        !a.key.startsWith("templates/")
                );

                console.log(`[TEMPLATE-SCAN] Total assets: ${allAssets.length}, Scannable: ${scannableAssets.length}, Templates: ${templateSuffixes.length}`);

                // 3. Scanner avec retry et backoff
                const assetsWithContent = await scanAssetsInBatches(
                    scannableAssets, domain, activeThemeId, session.accessToken!,
                    (scanned, total) => {
                        const progress = Math.min(99, Math.round((scanned / total) * 100));
                        controller.enqueue(encoder.encode(sse({ progress })));
                    },
                    2, 200
                );

                // 4. Analyse du contenu
                for (const { content } of assetsWithContent) {
                    templateSuffixes.forEach((suffix: string) => {
                        if (content.includes(`"${suffix}"`) || content.includes(`'${suffix}'`)) {
                            templatesInCode.add(suffix);
                        }
                    });
                }

                console.log(`[TEMPLATE-SCAN] Scan complete. Assets with content: ${assetsWithContent.length}. Templates found: ${templatesInCode.size}`);
                console.log(`[TEMPLATE-SCAN] Results:`, Array.from(templatesInCode).slice(0, 10));
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(templatesInCode) })));
            } catch (e) {
                console.error(`[TEMPLATE-SCAN] Fatal error:`, e);
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(templatesInCode), error: String(e) })));
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
