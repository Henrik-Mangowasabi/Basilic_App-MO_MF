import { authenticate } from "../shopify.server";
import { fetchAssetsList, scanAssetsInBatches } from "../utils/theme-assets.server";

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
                console.log(`[SECTION-SCAN] Starting scan. Domain: ${domain}, Theme ID: ${activeThemeId}`);
                controller.enqueue(encoder.encode(sse({ progress: 1, message: "Récupération des assets..." })));

                // 1. Lister TOUS les assets du thème avec retry
                const allAssets = await fetchAssetsList(domain, activeThemeId, session.accessToken!);

                // 2. Filtrer pour obtenir les fichiers sections/*.liquid
                const sectionAssets = allAssets.filter((a: { key: string }) =>
                    a.key.includes('sections/') && a.key.endsWith('.liquid')
                );

                console.log(`[SECTION-SCAN] Total assets: ${allAssets.length}, Section files: ${sectionAssets.length}`);
                console.log(`[SECTION-SCAN] Sample section files (0-15):`, sectionAssets.slice(0, 15).map(a => a.key));
                controller.enqueue(encoder.encode(sse({ progress: 5, message: `${sectionAssets.length} sections trouvées...` })));

                // 3. Pour chaque section, récupérer le contenu et extraire le nom du schema (avec retry)
                const sectionsData: Array<{
                    fileName: string;
                    key: string;
                    schemaName: string;
                    assignments: string[];
                }> = [];

                const sectionContents = await scanAssetsInBatches(
                    sectionAssets, domain, activeThemeId, session.accessToken!,
                    (scanned, total) => {
                        const progress = Math.round(5 + (scanned / total) * 30);
                        controller.enqueue(encoder.encode(sse({ progress, message: "Analyse des sections..." })));
                    },
                    2, 200
                );

                for (const { key, content } of sectionContents) {
                    const fileName = key.replace('sections/', '').replace('.liquid', '');
                    let schemaName = fileName;
                    const schemaMatch = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/i);
                    if (schemaMatch) {
                        try {
                            const schemaJson = JSON.parse(schemaMatch[1]);
                            if (schemaJson.name) schemaName = schemaJson.name;
                        } catch (e) { /* fallback to fileName */ }
                    }
                    sectionsData.push({ fileName, key, schemaName, assignments: [] });
                }

                // Aussi ajouter les sections dont le contenu n'a pas pu être récupéré
                const fetchedKeys = new Set(sectionContents.map(c => c.key));
                for (const asset of sectionAssets) {
                    if (!fetchedKeys.has(asset.key)) {
                        const fileName = asset.key.replace('sections/', '').replace('.liquid', '');
                        sectionsData.push({ fileName, key: asset.key, schemaName: fileName, assignments: [] });
                    }
                }

                console.log(`[SECTION-SCAN] Sections parsed: ${sectionsData.length} (${sectionContents.length} with content)`);
                controller.enqueue(encoder.encode(sse({ progress: 35, message: "Récupération des fichiers JSON..." })));

                // 4. Récupérer tous les fichiers susceptibles de contenir des sections
                const scanAssets = allAssets.filter((a: { key: string }) =>
                    (a.key.startsWith('templates/') || a.key.startsWith('sections/') || a.key.startsWith('layout/') || a.key.startsWith('snippets/')) &&
                    (a.key.endsWith('.json') || a.key.endsWith('.liquid'))
                );

                controller.enqueue(encoder.encode(sse({ progress: 40, message: `${scanAssets.length} fichiers à scanner...` })));

                // 5. Scanner les fichiers pour trouver les assignations (avec retry)
                const scanContents = await scanAssetsInBatches(
                    scanAssets, domain, activeThemeId, session.accessToken!,
                    (scanned, total) => {
                        const progress = Math.round(40 + (scanned / total) * 55);
                        controller.enqueue(encoder.encode(sse({ progress, message: "Scan des assignations..." })));
                    },
                    2, 200
                );

                for (const { key: assetKey, content } of scanContents) {
                    const foundTypesAcrossFile = new Set<string>();

                    if (assetKey.endsWith('.json')) {
                        try {
                            const parsedJson = JSON.parse(content);
                            const findSectionTypes = (obj: any, depth = 0) => {
                                if (depth > 50) return;
                                if (typeof obj === 'object' && obj !== null) {
                                    if (obj.type && typeof obj.type === 'string' && obj.type.length > 0) {
                                        foundTypesAcrossFile.add(obj.type);
                                    }
                                    if (obj.block_type && typeof obj.block_type === 'string' && obj.block_type.length > 0) {
                                        foundTypesAcrossFile.add(obj.block_type);
                                    }
                                    Object.values(obj).forEach(val => findSectionTypes(val, depth + 1));
                                }
                            };
                            findSectionTypes(parsedJson);
                        } catch (e) {}
                    } else if (assetKey.endsWith('.liquid')) {
                        const sectionRegex1 = /\{%\s*-?\s*sections?\s*['"]([^'"]+)['"]\s*-?\s*%\}/g;
                        let match;
                        while ((match = sectionRegex1.exec(content)) !== null) {
                            foundTypesAcrossFile.add(match[1]);
                        }
                        const includeRegex = /\{%\s*-?\s*include\s+['"]sections\/([^'"]+)['"]\s*-?\s*%\}/g;
                        while ((match = includeRegex.exec(content)) !== null) {
                            foundTypesAcrossFile.add(match[1]);
                        }
                        const renderRegex = /\{%\s*-?\s*render\s+['"]sections\/([^'"]+)['"]\s*-?\s*%\}/g;
                        while ((match = renderRegex.exec(content)) !== null) {
                            foundTypesAcrossFile.add(match[1]);
                        }
                    }

                    foundTypesAcrossFile.forEach(type => {
                        const section = sectionsData.find(s => s.fileName === type);
                        if (section && !section.assignments.includes(assetKey)) {
                            section.assignments.push(assetKey);
                        }
                    });
                }

                // 6. Retourner TOUTES les sections (pas seulement celles avec assignations)
                console.log(`[SECTION-SCAN] Scan complete. Total sections: ${sectionsData.length}`);
                const results = sectionsData.map(s => ({
                    id: s.key,
                    fileName: s.fileName,
                    key: s.key,
                    schemaName: s.schemaName,
                    assignmentCount: s.assignments.length,
                    assignments: s.assignments
                }));
                console.log(`[SECTION-SCAN] Results (first 5):`, results.slice(0, 5));
                controller.enqueue(encoder.encode(sse({
                    progress: 100,
                    results
                })));
            } catch (e) {
                console.error(`[SECTION-SCAN] Fatal error:`, e);
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
