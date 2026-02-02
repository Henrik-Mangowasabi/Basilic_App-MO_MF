import { authenticate } from "../shopify.server";

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

    // 1. Lister les assets du thème (pour trouver tous les templates existants)
    const assetsRes = await fetch(
        `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
        { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
    );
    const assetsJson = await assetsRes.json();
    const allAssets = assetsJson.assets || [];
    
    // Identifier les templates (ex: templates/product.custom.json)
    const templateSuffixes = allAssets
        .filter((a: { key: string }) => a.key.startsWith('templates/') && a.key.endsWith('.json'))
        .map((a: { key: string }) => {
            const parts = a.key.replace('templates/', '').replace('.json', '').split('.');
            return parts.length > 1 ? parts.slice(1).join('.') : null;
        })
        .filter(Boolean) as string[];

    // 2. Fichiers à scanner (Liquid, JS, JSON)
    const scannableExtensions = [".liquid", ".js", ".json"];
    const scannableAssets = allAssets.filter(
        (a: { key: string }) =>
            scannableExtensions.some((ext: string) => a.key.endsWith(ext)) &&
            !a.key.includes("node_modules") &&
            !a.key.includes(".min.") &&
            !a.key.startsWith("templates/") // Pas besoin de scanner les fichiers de templates eux-mêmes
    );

    // 3. Scanner
    const batchSize = 10;
    const totalBatches = Math.ceil(scannableAssets.length / batchSize) || 1;
    const templatesInCode = new Set<string>();
    
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
                                const response = await fetch(
                                    `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`,
                                    { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
                                );
                                if (!response.ok) return;
                                const assetData: { asset?: { value?: string } } = await response.json();
                                const content = assetData.asset?.value || "";
                                if (!content) return;

                                templateSuffixes.forEach((suffix: string) => {
                                    if (content.includes(`"${suffix}"`) || content.includes(`'${suffix}'`)) {
                                        templatesInCode.add(suffix);
                                    }
                                });
                            } catch (e) { /* ignore */ }
                        })
                    );
                    const batchIndex = Math.floor(i / batchSize) + 1;
                    const progress = Math.min(99, Math.round((batchIndex / totalBatches) * 100));
                    controller.enqueue(encoder.encode(sse({ progress })));
                }
                controller.enqueue(encoder.encode(sse({ progress: 100, results: Array.from(templatesInCode) })));
            } catch (e) {
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
