import { authenticate } from "../shopify.server";

/**
 * Route API : scan du thème pour les sections, stream progression 0-100.
 * Récupère toutes les sections (sections/*.liquid) et compte leurs assignations
 * dans les fichiers templates/*.json et sections/*.json
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

    const stream = new ReadableStream({
        async start(controller) {
            try {
                controller.enqueue(encoder.encode(sse({ progress: 1, message: "Récupération des assets..." })));

                // 1. Lister tous les assets du thème
                const assetsRes = await fetch(
                    `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
                    { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
                );
                const assetsJson = await assetsRes.json();
                const allAssets = assetsJson.assets || [];

                // 2. Filtrer pour obtenir les fichiers sections/*.liquid
                const sectionAssets = allAssets.filter((a: { key: string }) =>
                    a.key.startsWith('sections/') && a.key.endsWith('.liquid')
                );

                controller.enqueue(encoder.encode(sse({ progress: 5, message: `${sectionAssets.length} sections trouvées...` })));

                // 3. Pour chaque section, récupérer le contenu et extraire le nom du schema
                const sectionsData: Array<{
                    fileName: string;
                    key: string;
                    schemaName: string;
                    assignments: string[];
                }> = [];

                const batchSize = 10;
                const totalSections = sectionAssets.length;

                for (let i = 0; i < sectionAssets.length; i += batchSize) {
                    const batch = sectionAssets.slice(i, i + batchSize);

                    await Promise.all(batch.map(async (asset: { key: string }) => {
                        try {
                            const url = `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                            const res = await fetch(url, {
                                headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                            });

                            if (!res.ok) return;

                            const json = await res.json();
                            const content = json.asset?.value || "";

                            // Extraire le nom du fichier (ex: sections/header.liquid -> header)
                            const fileName = asset.key.replace('sections/', '').replace('.liquid', '');

                            // Extraire le nom du schema
                            let schemaName = fileName;
                            const schemaMatch = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/i);
                            if (schemaMatch) {
                                try {
                                    const schemaContent = schemaMatch[1];
                                    const schemaJson = JSON.parse(schemaContent);
                                    if (schemaJson.name) {
                                        schemaName = schemaJson.name;
                                    }
                                } catch (e) {
                                    // Si le parsing échoue, on garde le nom du fichier
                                }
                            }

                            sectionsData.push({
                                fileName,
                                key: asset.key,
                                schemaName,
                                assignments: []
                            });
                        } catch (e) {
                            // Ignorer les erreurs
                        }
                    }));

                    const sectionsProgress = Math.round(5 + ((i + batch.length) / totalSections) * 30);
                    controller.enqueue(encoder.encode(sse({ progress: sectionsProgress, message: "Analyse des sections..." })));
                }

                controller.enqueue(encoder.encode(sse({ progress: 35, message: "Récupération des fichiers JSON..." })));

                // 4. Récupérer tous les fichiers JSON (templates/*.json et sections/*.json)
                const jsonAssets = allAssets.filter((a: { key: string }) =>
                    (a.key.startsWith('templates/') || a.key.startsWith('sections/')) && a.key.endsWith('.json')
                );

                controller.enqueue(encoder.encode(sse({ progress: 40, message: `${jsonAssets.length} fichiers JSON à scanner...` })));

                // 5. Scanner les fichiers JSON pour trouver les assignations
                const totalJsonFiles = jsonAssets.length;

                for (let i = 0; i < jsonAssets.length; i += batchSize) {
                    const batch = jsonAssets.slice(i, i + batchSize);

                    await Promise.all(batch.map(async (asset: { key: string }) => {
                        try {
                            const url = `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                            const res = await fetch(url, {
                                headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                            });

                            if (!res.ok) return;

                            const json = await res.json();
                            const content = json.asset?.value || "";

                            // Parser le JSON
                            try {
                                const parsedJson = JSON.parse(content);

                                // Fonction récursive pour chercher toutes les occurrences de "type"
                                const findSectionTypes = (obj: any, fileName: string): string[] => {
                                    const types: string[] = [];

                                    if (typeof obj === 'object' && obj !== null) {
                                        if (obj.type && typeof obj.type === 'string') {
                                            types.push(obj.type);
                                        }

                                        Object.values(obj).forEach(value => {
                                            types.push(...findSectionTypes(value, fileName));
                                        });
                                    }

                                    return types;
                                };

                                const foundTypes = findSectionTypes(parsedJson, asset.key);

                                // Pour chaque type trouvé, l'associer à la section correspondante
                                foundTypes.forEach(type => {
                                    const section = sectionsData.find(s => s.fileName === type);
                                    if (section && !section.assignments.includes(asset.key)) {
                                        section.assignments.push(asset.key);
                                    }
                                });
                            } catch (e) {
                                // Ignorer les erreurs de parsing JSON
                            }
                        } catch (e) {
                            // Ignorer les erreurs
                        }
                    }));

                    const jsonProgress = Math.round(40 + ((i + batch.length) / totalJsonFiles) * 55);
                    controller.enqueue(encoder.encode(sse({ progress: jsonProgress, message: "Scan des assignations..." })));
                }

                // 6. Retourner les résultats
                controller.enqueue(encoder.encode(sse({
                    progress: 100,
                    results: sectionsData.map(s => ({
                        fileName: s.fileName,
                        key: s.key,
                        schemaName: s.schemaName,
                        assignmentCount: s.assignments.length,
                        assignments: s.assignments
                    }))
                })));
            } catch (e) {
                controller.enqueue(encoder.encode(sse({
                    progress: 100,
                    results: [],
                    error: String(e)
                })));
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
