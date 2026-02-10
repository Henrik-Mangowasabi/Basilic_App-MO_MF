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

                // 1. Lister TOUS les assets du thème via REST API
                const assetsRes = await fetch(
                    `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
                    { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
                );
                const assetsJson = await assetsRes.json();
                const allAssets = (assetsJson.assets || []) as { key: string }[];

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

                const batchSize = 2;
                const totalSections = sectionAssets.length;

                for (let i = 0; i < sectionAssets.length; i += batchSize) {
                    const batch = sectionAssets.slice(i, i + batchSize);

                    await Promise.all(batch.map(async (asset: { key: string }) => {
                        try {
                            const url = `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                            const res = await fetch(url, {
                                headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                            });

                            if (!res.ok) {
                                console.warn(`Failed to fetch section ${asset.key}: ${res.status}`);
                                return;
                            }

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
                            console.error(`Error processing section ${asset.key}:`, e);
                        }
                    }));

                    const sectionsProgress = Math.round(5 + ((i + batch.length) / totalSections) * 30);
                    controller.enqueue(encoder.encode(sse({ progress: sectionsProgress, message: "Analyse des sections..." })));

                    await new Promise(r => setTimeout(r, 100));
                }

                controller.enqueue(encoder.encode(sse({ progress: 35, message: "Récupération des fichiers JSON..." })));

                // 4. Récupérer tous les fichiers susceptibles de contenir des sections
                const scanAssets = allAssets.filter((a: { key: string }) =>
                    (a.key.startsWith('templates/') || a.key.startsWith('sections/') || a.key.startsWith('layout/') || a.key.startsWith('snippets/')) && 
                    (a.key.endsWith('.json') || a.key.endsWith('.liquid'))
                );

                controller.enqueue(encoder.encode(sse({ progress: 40, message: `${scanAssets.length} fichiers à scanner...` })));

                // 5. Scanner les fichiers pour trouver les assignations
                const totalScanFiles = scanAssets.length;

                for (let i = 0; i < scanAssets.length; i += batchSize) {
                    const batch = scanAssets.slice(i, i + batchSize);

                    await Promise.all(batch.map(async (asset: { key: string }) => {
                        try {
                            const url = `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                            const res = await fetch(url, {
                                headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                            });

                            if (!res.ok) {
                                console.warn(`Failed to fetch file ${asset.key}: ${res.status}`);
                                return;
                            }

                            const json = await res.json();
                            const content = json.asset?.value || "";

                            const foundTypesAcrossFile = new Set<string>();

                            if (asset.key.endsWith('.json')) {
                                try {
                                    const parsedJson = JSON.parse(content);
                                    const findSectionTypes = (obj: any, depth = 0) => {
                                        if (depth > 50) return; // Éviter la récursion infinie
                                        if (typeof obj === 'object' && obj !== null) {
                                            // Chercher 'type' (main pattern)
                                            if (obj.type && typeof obj.type === 'string' && obj.type.length > 0) {
                                                foundTypesAcrossFile.add(obj.type);
                                            }
                                            // Chercher aussi 'block_type' pour les blocks
                                            if (obj.block_type && typeof obj.block_type === 'string' && obj.block_type.length > 0) {
                                                foundTypesAcrossFile.add(obj.block_type);
                                            }
                                            // Parcourir récursivement
                                            Object.values(obj).forEach(val => findSectionTypes(val, depth + 1));
                                        }
                                    };
                                    findSectionTypes(parsedJson);
                                } catch (e) {}
                            } else if (asset.key.endsWith('.liquid')) {
                                // Pattern 1: {% section 'nom' %} ou {% section "nom" %}
                                const sectionRegex1 = /\{%\s*-?\s*sections?\s*['"]([^'"]+)['"]\s*-?\s*%\}/g;
                                let match;
                                while ((match = sectionRegex1.exec(content)) !== null) {
                                    foundTypesAcrossFile.add(match[1]);
                                }

                                // Pattern 2: {% include 'sections/nom' %} (ancienne façon)
                                const includeRegex = /\{%\s*-?\s*include\s+['"]sections\/([^'"]+)['"]\s*-?\s*%\}/g;
                                while ((match = includeRegex.exec(content)) !== null) {
                                    foundTypesAcrossFile.add(match[1]);
                                }

                                // Pattern 3: render 'sections/nom'
                                const renderRegex = /\{%\s*-?\s*render\s+['"]sections\/([^'"]+)['"]\s*-?\s*%\}/g;
                                while ((match = renderRegex.exec(content)) !== null) {
                                    foundTypesAcrossFile.add(match[1]);
                                }
                            }

                            // Pour chaque type trouvé, l'associer à la section correspondante
                            foundTypesAcrossFile.forEach(type => {
                                const section = sectionsData.find(s => s.fileName === type);
                                if (section && !section.assignments.includes(asset.key)) {
                                    section.assignments.push(asset.key);
                                }
                            });
                        } catch (e) {
                            console.error(`Error processing file ${asset.key}:`, e);
                        }
                    }));

                    const scanProgress = Math.round(40 + ((i + batch.length) / totalScanFiles) * 55);
                    controller.enqueue(encoder.encode(sse({ progress: scanProgress, message: "Scan des assignations..." })));

                    await new Promise(r => setTimeout(r, 100));
                }

                // 6. Retourner les résultats
                controller.enqueue(encoder.encode(sse({
                    progress: 100,
                    results: sectionsData.map(s => ({
                        id: s.key,
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
