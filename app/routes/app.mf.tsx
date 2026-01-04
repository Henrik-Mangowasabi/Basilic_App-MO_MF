import { useState, useEffect, useRef } from "react";
import { useLoaderData, useSubmit, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- CSS ADAPTÉ DE GLOBAL.JS ---
const STYLES = `
    body, html { margin: 0; padding: 0; }
    .mm-container { max-width: 100%; width: 100%; margin: 0; background: #fff; padding: 25px; border-radius: 0; box-shadow: none; }
    .mm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .search-box { width: 100%; padding: 15px; margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; }
    
    /* TABS */
    .tabs { display: flex; gap: 5px; margin-bottom: 25px; border-bottom: 2px solid #ddd; }
    .tab-link { padding: 12px 20px; cursor: pointer; border-radius: 8px 8px 0 0; font-weight: bold; color: #666; text-decoration: none; display:block; }
    .tab-link:hover { background: #f4f6f8; text-decoration: none; }
    .tab-link.active { background: #008060; color: #fff; }
    .tab-badge { margin-left: 5px; opacity: 0.8; font-size: 0.9em; }

    /* ACCORDION */
    .accordion { background: #fff; cursor: pointer; padding: 15px 20px; width: 100%; border: none; text-align: left; border-bottom: 1px solid #f1f1f1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
    .accordion:hover { background: #fcfcfc; }
    .active-acc { background: #f8f9fa; border-bottom: 2px solid #008060; color: #008060; }
    
    /* SECTION WRAPPER */
    .section-wrapper { margin-bottom: 0; }
    
    /* TABLES */
    .main-table { width: 100%; border-collapse: collapse; margin: 0 0 30px 0; table-layout: fixed; }
    .section-wrapper:last-child .main-table { margin-bottom: 0; }
    th { background: #fff; padding: 12px 5px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #eee; color: #555; text-align:left; cursor: default; }
    th.sortable { cursor: pointer !important; user-select: none; }
    th.sortable:hover { background-color: #f9f9f9; }
    td { padding: 10px 5px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: middle; }
    
    /* COLONNES FIXES - Comme dans global.js */
    .col-nom-desc { width: auto; }
    .col-img, .col-vol, .col-lien, .col-del { width: 80px; text-align: center; white-space: nowrap; }
    
    /* MODE DEV */
    .col-tech, .dev-zone, .col-code, .col-type { display: none; }
    .dev-mode .col-nom-desc { width: 30%; }
    .dev-mode .col-tech { display: table-cell; width: 20%; word-break: break-all; white-space: normal; font-family: monospace; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    .dev-mode .col-type { display: table-cell; width: 8%; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    .dev-mode .dev-zone { display: table-cell; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    .dev-mode .col-code { display: table-cell; width: 80px; text-align: center; white-space: nowrap; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    
    /* EN-TÊTES CENTRÉS POUR COLONNES DEV */
    th.col-tech, th.col-type, th.dev-zone, th.col-code { text-align: center; }
    
    /* STYLES POUR LES CELLULES */
    td.col-img, td.col-vol, td.col-lien, td.col-del, td.col-code { text-align: center; }
    td.col-tech, td.dev-zone, td.col-code, td.col-type { background-color: #e8e8e8; }

    /* ELEMENTS */
    .type-pill { background: #f1f3f5; padding: 3px 8px; border-radius: 12px; font-size: 10px; display: inline-block; }
    .count-bubble { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 50%; font-size: 12px; }
    .img-box { width: 35px; height: 35px; position: relative; margin: 0 auto; cursor: pointer; }
    .img-box img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
    .img-box:hover img { transform: scale(1.5); position:relative; z-index:10; transition:0.2s; }
    .del-img { position:absolute; top:-5px; right:-5px; background:white; border-radius:50%; width:15px; height:15px; font-size:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(0,0,0,0.2); }
    
    .edit-icon { opacity: 0.6; cursor: pointer; color: #888; margin-left: 8px; }
    .edit-icon:hover { opacity: 1; color: #008060; }
    .btn-del { border: none; background: none; cursor: pointer; color: #999; }
    .btn-del:hover { color: red; }
    
    .highlight { background-color: #fff0f0; color: red; font-weight: bold; }
    
    /* MODAL */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; }
    .modal-box { background: #fff; padding: 25px; border-radius: 12px; width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
`;

// --- TRADUCTION TYPES ---
const TYPE_FR: any = {
    'single_line_text_field': '📝 Texte (1 ligne)', 'multi_line_text_field': '📝 Texte (multiligne)',
    'number_integer': '🔢 Nombre entier', 'number_decimal': '🔢 Nombre décimal', 'boolean': 'Vrai / Faux',
    'url': '🔗 URL', 'json': 'JSON', 'date': '📅 Date', 'date_time': '📅 Date et heure',
    'color': '🎨 Couleur', 'weight': '⚖️ Poids', 'volume': '🧪 Volume', 'dimension': '📏 Dimension',
    'rating': '⭐ Note', 'money': '💰 Argent', 'file_reference': '📎 Fichier',
    'product_reference': '🛍️ Produit', 'variant_reference': '👕 Variante', 'collection_reference': '📂 Collection',
    'page_reference': '📄 Page', 'customer_reference': '👤 Client', 'metaobject_reference': '💠 Métaobjet'
};
const translateType = (t: string) => {
    if (!t) return '-';
    if (t.startsWith('list.')) return `📚 Liste de ${TYPE_FR[t.replace('list.', '')] || t.replace('list.', '')}`;
    return TYPE_FR[t] || t;
};

// --- BACKEND LOADER ---
export const loader = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    
    // 1. Charger Images locales
    const localImages = await db.localImage.findMany();
    const imgMap: Record<string, string> = {};
    localImages.forEach(img => imgMap[img.id] = img.data);

    // 2. Apps installées (pour analyse namespace) - Optionnel, peut échouer si pas de permissions
    const installedApps: Record<string, string> = {};
    try {
        const appsRes = await admin.graphql(`{ appInstallations(first:100){nodes{app{title handle}}} }`);
        const appsJson = await appsRes.json();
        appsJson.data?.appInstallations?.nodes?.forEach((n: any) => {
            if(n.app?.handle) {
                // Stocker en lowercase pour la comparaison (comme dans global.js)
                installedApps[n.app.handle.toLowerCase()] = n.app.title;
            }
        });
    } catch (error) {
        // Si pas de permissions pour appInstallations, on continue sans cette info
        console.warn("Impossible de charger les applications installées:", error);
    }
    
    // Mapping des namespaces Shopify connus vers leurs apps
    const shopifyNamespaceApps: Record<string, string> = {
        'shopify--discovery': 'Search and Discovery',
        'discovery': 'Search and Discovery',
    };

    // 3. Helper GraphQL
    const loadMF = async (ownerType: string) => {
        const q = `#graphql
            query { metafieldDefinitions(ownerType: ${ownerType}, first: 50) { nodes { id name namespace key description type { name } metafieldsCount } } }
        `;
        try {
            const res = await admin.graphql(q);
            const json = await res.json();
            return (json.data?.metafieldDefinitions?.nodes || []).map((n: any) => {
                const ns = n.namespace.toLowerCase();
                
                // Chercher si le namespace correspond à une app installée (comme dans global.js)
                let appName = null;
                let isAppInstalled = false;
                
                // PRIORITÉ 1: Vérifier d'abord les namespaces Shopify connus qui correspondent à des apps spécifiques
                // Ex: shopify--discovery--* correspond à "Search and Discovery"
                for (const [namespacePattern, appTitle] of Object.entries(shopifyNamespaceApps)) {
                    if (ns.includes(namespacePattern)) {
                        // Chercher l'app dans les apps installées pour obtenir le titre exact
                        for (const [handle, title] of Object.entries(installedApps)) {
                            const titleLower = title.toLowerCase();
                            if (titleLower.includes('search') && titleLower.includes('discovery')) {
                                appName = title; // Utiliser le titre exact de l'app
                                isAppInstalled = true;
                                break;
                            }
                        }
                        // Si pas trouvée dans les apps installées, utiliser le mapping
                        if (!appName) {
                            appName = appTitle;
                            isAppInstalled = true; // App système Shopify, considérée comme "installée"
                        }
                        break;
                    }
                }
                
                // PRIORITÉ 2: Vérifier les apps installées par handle/namespace (si pas déjà trouvé)
                if (!appName) {
                    for (const [handle, title] of Object.entries(installedApps)) {
                        // Comparaison exacte comme dans global.js
                        if (ns === handle || ns.includes(handle) || handle.includes(ns)) {
                            appName = title;
                            isAppInstalled = true;
                            break;
                        }
                    }
                }
                
                // Déterminer le statut selon la logique de global.js
                let status = '';
                if (ns === 'custom' || ns === 'test_data' || ns.startsWith('etst')) {
                    // Pour l'instant, on ne scanne pas le code, donc on met juste "Manuel"
                    status = '👤 Manuel';
                } else if (appName && isAppInstalled) {
                    // App installée - on pourrait vérifier si elle est active avec scanCode mais pour l'instant on simplifie
                    status = `✅ App: ${appName}`;
                } else {
                    // PRIORITÉ 3: Vérifier si c'est un namespace Shopify système générique (pas une app spécifique)
                    if (ns.includes('shopify') && !ns.includes('--')) {
                        // Namespace générique Shopify (ex: shopify, shopify_meta, etc.)
                        status = '⚙️ Système Shopify';
                    } else if (ns.includes('shopify')) {
                        // Namespace Shopify avec -- mais pas dans notre mapping (ex: shopify--autre--)
                        status = '⚙️ Système Shopify';
                    } else {
                        // App désinstallée - utiliser le namespace original (pas lowercase)
                        status = `🗑️ App Désinstallée\nNamespace: ${n.namespace}`;
                    }
                }

                return {
                    ...n, kind: 'MF', ownerType,
                    img: imgMap[n.id],
                    count: n.metafieldsCount,
                    typeDisplay: translateType(n.type?.name),
                    fullKey: `${n.namespace}.${n.key}`,
                    status
                };
            });
        } catch { return []; }
    };

    // 4. Charger tout
    const resources = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    const results = await Promise.all(resources.map(r => loadMF(r)));
    
    // Mapping pour le frontend
    const mfData = {
        p: results[0], v: results[1], c: results[2], cl: results[3],
        o: results[4], do_: results[5], co: results[6], loc: results[7],
        m: results[8], pg: results[9], b: results[10], art: results[11], s: results[12]
    };
    
    const totalCount = results.reduce((acc, curr) => acc + curr.length, 0);
    
    // Charger le nombre de MO pour l'affichage dans les tabs
    let moCount = 0;
    try {
        const moRes = await admin.graphql(`{ metaobjectDefinitions(first: 1) { pageInfo { hasNextPage } } }`);
        const moJson = await moRes.json();
        // Pour avoir le vrai count, on charge tous les MO
        const moAllRes = await admin.graphql(`{ metaobjectDefinitions(first: 50) { nodes { id } } }`);
        const moAllJson = await moAllRes.json();
        moCount = moAllJson.data?.metaobjectDefinitions?.nodes?.length || 0;
    } catch (e) {
        console.warn("Could not fetch MO count", e);
    }
    
    const shopRes = await admin.graphql(`{shop{name myshopifyDomain}}`);
    const shopJson = await shopRes.json();
    const shopName = shopJson.data.shop.name;
    const shopDomain = shopJson.data.shop.myshopifyDomain;

    return { shop: shopName, shopDomain, mfData, totalCount, moCount };
};

// --- BACKEND ACTIONS ---
export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");

    if (actionType === "upload_image") {
        const id = formData.get("id") as string;
        const image = formData.get("image") as string; // Base64
        await db.localImage.upsert({ where: { id }, update: { data: image }, create: { id, data: image } });
        return { ok: true };
    }
    if (actionType === "delete_image") {
        await db.localImage.delete({ where: { id: formData.get("id") as string } }).catch(()=>{});
        return { ok: true };
    }
    if (actionType === "delete_item") {
        await admin.graphql(`#graphql mutation { metafieldDefinitionDelete(id: "${formData.get("id")}") { userErrors { message } } }`);
        return { ok: true };
    }
    if (actionType === "update_desc") {
        const description = formData.get("description") as string || '';
        const key = formData.get("key") as string;
        const ownerType = formData.get("ownerType") as string;
        const name = formData.get("name") as string;
        
        const [ns, ...kParts] = key.split('.');
        const actualKey = kParts.join('.');
        
        // Échapper les caractères spéciaux pour GraphQL
        const escapeGraphQL = (str: string) => {
            return str
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
        };
        
        const safeDescription = escapeGraphQL(description);
        const safeName = escapeGraphQL(name);
        const safeNamespace = escapeGraphQL(ns);
        const safeKey = escapeGraphQL(actualKey);
        
        const mutation = `#graphql
            mutation {
                metafieldDefinitionUpdate(definition: {
                    ownerType: ${ownerType}
                    namespace: "${safeNamespace}"
                    key: "${safeKey}"
                    name: "${safeName}"
                    description: "${safeDescription}"
                }) {
                    userErrors {
                        message
                    }
                }
            }
        `;
        
        const res = await admin.graphql(mutation);
        const json = await res.json();
        const errors = json.data?.metafieldDefinitionUpdate?.userErrors;
        if (errors && errors.length > 0) {
            throw new Error(errors[0].message);
        }
        return { ok: true };
    }
    return null;
};

// --- COMPOSANT FRONTEND ---
export default function AppMf() {
    const { shop, shopDomain, mfData, totalCount, moCount = 0 } = useLoaderData<any>();
    const submit = useSubmit();
    
    // State
    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [modalData, setModalData] = useState<any>(null);
    const [sortBy, setSortBy] = useState<'name' | 'description' | 'fullKey' | 'type' | 'status' | 'count' | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const initializedRef = useRef(false);
    const initialSectionsStateRef = useRef<Record<string, boolean>>({});

    // Fonction de normalisation (comme dans global.js)
    const norm = (s: string) => {
        return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    // Initialisation Dev Mode et première section ouverte
    useEffect(() => { 
        setDevMode(localStorage.getItem('mm_dev_mode') === 'true');
        
        // Ouvrir la première section qui a des données (une seule fois au chargement)
        if(!initializedRef.current && mfData) {
            const sections = ['p', 'v', 'c', 'cl', 'o', 'do_', 'co', 'loc', 'm', 'pg', 'b', 'art', 's'];
            const sectionKeys = ['Produits', 'Variantes', 'Collections', 'Clients', 'Commandes', 'Commandes Provisoires', 'Entreprises B2B', 'Emplacements (Stock)', 'Marchés', 'Pages', 'Blogs', 'Articles', 'Boutique'];
            const initialState: Record<string, boolean> = {};
            for(let i = 0; i < sections.length; i++) {
                const key = sections[i];
                if(mfData[key] && mfData[key].length > 0) {
                    initialState[sectionKeys[i]] = true;
                    initializedRef.current = true;
                    break;
                }
            }
            setOpenSections(initialState);
            initialSectionsStateRef.current = { ...initialState };
        }
    }, [mfData]);

    // Restaurer l'état initial des sections quand la recherche est vide
    useEffect(() => {
        if(!search && Object.keys(initialSectionsStateRef.current).length > 0) {
            setOpenSections({ ...initialSectionsStateRef.current });
        }
    }, [search]);
    
    const toggleDev = () => {
        const newVal = !devMode;
        setDevMode(newVal);
        localStorage.setItem('mm_dev_mode', newVal ? 'true' : 'false');
    };

    // Actions
    const handleUpload = (id: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => submit({ action: "upload_image", id, image: e.target?.result as string }, { method: "post" });
        reader.readAsDataURL(file);
    };

    // Fonction de tri
    const sortData = (data: any[]) => {
        if (!sortBy) return data;
        return [...data].sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';
            if (sortBy === 'name') {
                aVal = (a.name || '').toLowerCase();
                bVal = (b.name || '').toLowerCase();
            } else if (sortBy === 'description') {
                aVal = (a.description || '').toLowerCase();
                bVal = (b.description || '').toLowerCase();
            } else if (sortBy === 'fullKey') {
                aVal = (a.fullKey || '').toLowerCase();
                bVal = (b.fullKey || '').toLowerCase();
            } else if (sortBy === 'type') {
                aVal = (a.typeDisplay || '').toLowerCase();
                bVal = (b.typeDisplay || '').toLowerCase();
            } else if (sortBy === 'status') {
                aVal = (a.status || '').toLowerCase();
                bVal = (b.status || '').toLowerCase();
            } else if (sortBy === 'count') {
                aVal = a.count || 0;
                bVal = b.count || 0;
            }
            let comparison: number;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    };

    const handleSort = (field: 'name' | 'description' | 'fullKey' | 'type' | 'status' | 'count') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Fonction pour construire l'URL Shopify (comme dans global.js)
    const getShopifyUrl = (ownerType: string, id: string) => {
        const map: Record<string, string> = {
            'PRODUCT': 'product', 'PRODUCTVARIANT': 'variant', 'COLLECTION': 'collection',
            'CUSTOMER': 'customer', 'ORDER': 'order', 'DRAFTORDER': 'draft_order',
            'COMPANY': 'company', 'COMPANY_LOCATION': 'company_location', 'LOCATION': 'location',
            'MARKET': 'market', 'PAGE': 'page', 'BLOG': 'blog', 'ARTICLE': 'article', 'SHOP': 'shop'
        };
        const resource = map[ownerType] || 'product';
        const cleanId = id.split('/').pop();
        const shopName = shopDomain ? shopDomain.replace('.myshopify.com', '') : '';
        return `https://admin.shopify.com/store/${shopName}/settings/custom_data/${resource}/metafields/${cleanId}`;
    };

    // Fonction pour générer une description depuis une clé
    const generateDescFromKey = (key: string) => {
        let clean = key.split('.').pop() || '';
        clean = clean.replace(/_/g, ' ');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    // Fonction pour auto-générer toutes les descriptions manquantes
    const autoGenerateAllMissing = async () => {
        // Collecter tous les champs méta sans description
        const allData: any[] = [];
        Object.values(mfData).forEach((sectionData: any) => {
            if(Array.isArray(sectionData)) {
                sectionData.forEach((d: any) => {
                    if(!d.description || d.description === '' || d.description === '-') {
                        allData.push(d);
                    }
                });
            }
        });

        if(allData.length === 0) {
            alert("Tout est déjà rempli !");
            return;
        }

        if(!confirm(`Générer ${allData.length} descriptions manquantes ?`)) return;

        // Traiter chaque élément
        for(let i = 0; i < allData.length; i++) {
            const mf = allData[i];
            const newDesc = generateDescFromKey(mf.fullKey);
            await submit({
                action: 'update_desc',
                id: mf.id,
                name: mf.name,
                description: newDesc,
                key: mf.fullKey,
                ownerType: mf.ownerType
            }, { method: 'post' });
        }

        alert(`Terminé ! ${allData.length} descriptions générées. Rechargement...`);
        setTimeout(() => window.location.reload(), 1000);
    };

    // Table Row Component
    const Row = ({ d }: any) => {
        // Le filtrage est fait dans Section avec filteredData, pas besoin de filtrer ici

        const highlight = (txt: string) => {
            if(!search || !txt) return txt;
            const escTerm = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escTerm})`, 'gi');
            const parts = txt.split(regex);
            return parts.map((p,i) => norm(p) === norm(search) ? <span key={i} className="highlight">{p}</span> : p);
        };

        // Construire le lien vers Shopify admin
        const shopifyLink = getShopifyUrl(d.ownerType, d.id);

        return (
            <tr>
                <td data-search-area="true">
                    <div style={{fontWeight:'bold'}}>{highlight(d.name)}</div>
                    <div style={{fontSize:'12px', color:'#666', display:'flex', alignItems:'center'}}>
                        {highlight(d.description || '-')}
                        <span className="edit-icon" onClick={(e)=>{e.stopPropagation(); setModalData(d)}}>✎</span>
                    </div>
                </td>
                {/* MÉMO, ASSIGN., LIEN ensemble */}
                <td className="col-img" data-search-area="true">
                    {d.img ? (
                        <div className="img-box">
                            <img src={d.img} alt="" />
                            <span className="del-img" onClick={(e)=>{e.stopPropagation(); if(confirm('Supprimer image?')) submit({action:'delete_image', id:d.id}, {method:'post'})}}>❌</span>
                        </div>
                    ) : (
                        <label style={{cursor:'pointer', fontSize:'20px'}}>📷<input type="file" hidden accept="image/*" onChange={(e)=>e.target.files && handleUpload(d.id, e.target.files[0])} /></label>
                    )}
                </td>
                <td className="col-vol" data-search-area="true"><strong style={{color:d.count>0?'#008060':'#ccc'}}>{highlight(d.count.toString())}</strong></td>
                <td className="col-lien">
                    <a href={shopifyLink} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', fontSize:'18px'}} title="Ouvrir dans Shopify Admin">🔗</a>
                </td>
                
                {/* Clé Tech, Type, DIAG, CODE */}
                <td className="col-tech dev-zone" data-search-area="true">{highlight(d.fullKey)}</td>
                <td className="col-type" data-search-area="true"><span className="type-pill">{highlight(d.typeDisplay)}</span></td>
                <td className="dev-zone" data-search-area="true" style={{fontSize:'11px', whiteSpace:'pre-line', lineHeight:'1.4'}}>
                    {d.status.split('\n').map((line: string, i: number) => {
                        const isWarning = line.includes('🗑️') || line.includes('App Désinstallée');
                        const isError = line.includes('Namespace:');
                        return (
                            <div key={i} style={{color: isWarning ? '#d32f2f' : isError ? '#666' : 'inherit', fontWeight: isWarning ? 'bold' : 'normal'}}>
                                {highlight(line)}
                            </div>
                        );
                    })}
                </td>
                <td className="col-code" data-search-area="true" style={{fontSize:'11px', color:'#999'}}>Non</td>
                
                <td className="col-del"><button className="btn-del" onClick={()=>{if(confirm('Supprimer ?')) submit({action:'delete_item', id:d.id}, {method:'post'})}}>🗑️</button></td>
            </tr>
        );
    };

    const Section = ({ title, icon, data }: any) => {
        // Utiliser l'état global pour garder les sections ouvertes même lors des changements
        const isOpen = openSections[title] || false;
        
        // Auto open on search (sans fermer les autres) - vérifie toutes les colonnes (comme global.js)
        useEffect(() => { 
            if(search) {
                const filter = norm(search);
                const hasMatch = data.some((d:any) => {
                    // Recherche dans les colonnes visibles selon le dev mode
                    let combinedText = "";
                    
                    // Colonnes toujours visibles
                    combinedText += (d.name || '') + " ";
                    combinedText += (d.description || '') + " ";
                    combinedText += (d.count || 0).toString() + " ";
                    
                    // Colonnes dev-zone seulement si dev mode activé
                    if(devMode) {
                        combinedText += (d.fullKey || '') + " ";
                        combinedText += (d.typeDisplay || '') + " ";
                        combinedText += (d.status || '') + " ";
                    }
                    
                    return norm(combinedText).includes(filter);
                });
                if(hasMatch && !openSections[title]) {
                    setOpenSections(prev => ({ ...prev, [title]: true }));
                }
            }
        }, [search, title, data, devMode]);
        
        const toggleSection = () => {
            const newState = { ...openSections, [title]: !openSections[title] };
            setOpenSections(newState);
            // Sauvegarder l'état seulement si pas de recherche active
            if(!search) {
                initialSectionsStateRef.current = { ...newState };
            }
        };
        
        // Filtrer les données (comme global.js - exclut dev-zone si pas en dev mode)
        const filteredData = data.filter((d:any) => {
            if(!search) return true;
            
            const filter = norm(search);
            let combinedText = "";
            
            // Colonnes toujours visibles
            combinedText += (d.name || '') + " ";
            combinedText += (d.description || '') + " ";
            combinedText += (d.count || 0).toString() + " ";
            
            // Colonnes dev-zone seulement si dev mode activé
            if(devMode) {
                combinedText += (d.fullKey || '') + " ";
                combinedText += (d.typeDisplay || '') + " ";
                combinedText += (d.status || '') + " ";
            }
            
            return norm(combinedText).includes(filter);
        });
        
        const sortedData = sortData(filteredData);
        
        // Hide section if search has no results inside
        if(search && filteredData.length === 0) return null;

        return (
            <div className="section-wrapper">
                <div className={`accordion ${isOpen?'active-acc':''}`} onClick={toggleSection}>
                    <div>{icon} <strong>{title}</strong> <span className="count-bubble">{filteredData.length}</span></div>
                    <span>{isOpen ? '▼' : '►'}</span>
                </div>
                {isOpen && (
                    filteredData.length === 0 ? (
                        <div style={{padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic'}}>
                            Aucun champ méta trouvé pour cette section.
                        </div>
                    ) : (
                        <table className="main-table">
                            <thead>
                                <tr>
                                    <th className="col-nom-desc sortable">
                                        <div 
                                            onClick={(e)=>{
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSort('name');
                                            }} 
                                            style={{cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '100%'}}
                                        >
                                            Nom & Desc
                                            {sortBy === 'name' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </div>
                                    </th>
                                    <th className="col-img" align="center">MÉMO</th>
                                    <th className="col-vol sortable" align="center">
                                        <div onClick={(e)=>{e.preventDefault(); e.stopPropagation(); handleSort('count');}} style={{cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '100%'}}>
                                            ASSIGN.
                                            {sortBy === 'count' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </div>
                                    </th>
                                    <th className="col-lien" align="center">LIEN</th>
                                    <th className="col-tech sortable" align="center">
                                        <div onClick={(e)=>{e.preventDefault(); e.stopPropagation(); handleSort('fullKey');}} style={{cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '100%'}}>
                                            Clé Tech
                                            {sortBy === 'fullKey' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </div>
                                    </th>
                                    <th className="col-type sortable" align="center">
                                        <div onClick={(e)=>{e.preventDefault(); e.stopPropagation(); handleSort('type');}} style={{cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '100%'}}>
                                            Type
                                            {sortBy === 'type' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </div>
                                    </th>
                                    <th className="dev-zone sortable" align="center">
                                        <div onClick={(e)=>{e.preventDefault(); e.stopPropagation(); handleSort('status');}} style={{cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '100%'}}>
                                            DIAG
                                            {sortBy === 'status' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </div>
                                    </th>
                                    <th className="col-code sortable" align="center">
                                        <div onClick={(e)=>{e.preventDefault(); e.stopPropagation();}} style={{cursor: 'default', userSelect: 'none', display: 'inline-block', width: '100%'}}>
                                            CODE
                                        </div>
                                    </th>
                                    <th className="col-del">🗑️</th>
                                </tr>
                            </thead>
                            <tbody>{sortedData.map((d:any) => <Row key={d.id} d={d} />)}</tbody>
                        </table>
                    )
                )}
            </div>
        );
    };

    return (
        <div className={devMode ? "dev-mode" : ""}>
            <style>{STYLES}</style>
            <div className="mm-container">
                <header className="mm-header">
                    <h1 style={{margin:0}}>MM Gestion - Champs Méta (MF)</h1>
                    <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                        <label style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'12px'}}>
                            <input type="checkbox" checked={devMode} onChange={toggleDev} /> 🛠️ Mode Dév
                        </label>
                        <button 
                            onClick={autoGenerateAllMissing}
                            style={{
                                background:'#008060', 
                                color:'white', 
                                border:'none', 
                                padding:'8px 15px', 
                                borderRadius:'6px', 
                                cursor:'pointer', 
                                fontWeight:'bold', 
                                fontSize:'12px'
                            }}
                        >
                            ✨ Auto-Générer Tout (Manquants)
                        </button>
                    </div>
                </header>

                <input className="search-box" placeholder="🔍 Rechercher un champ, une clé..." value={search} onChange={e=>setSearch(e.target.value)} />

                {/* VISUAL TABS (Links to pages) */}
                <div className="tabs">
                    <Link to="/app/mf" className="tab-link active">Champs Méta (MF) <span className="tab-badge">{totalCount}</span></Link>
                    <Link to="/app/mo" className="tab-link">Objets Méta (MO) <span className="tab-badge">{moCount || 0}</span></Link>
                </div>

                <div style={{display:'flex', flexDirection:'column'}}>
                    <Section title="Produits" icon="🛍️" data={mfData.p} />
                    <Section title="Variantes" icon="👕" data={mfData.v} />
                    <Section title="Collections" icon="📂" data={mfData.c} />
                    <Section title="Clients" icon="👥" data={mfData.cl} />
                    <Section title="Commandes" icon="📦" data={mfData.o} />
                    <Section title="Commandes Provisoires" icon="📝" data={mfData.do_} />
                    <Section title="Entreprises B2B" icon="🏢" data={mfData.co} />
                    <Section title="Emplacements (Stock)" icon="📍" data={mfData.loc} />
                    <Section title="Marchés" icon="🌍" data={mfData.m} />
                    <Section title="Pages" icon="📄" data={mfData.pg} />
                    <Section title="Blogs" icon="📰" data={mfData.b} />
                    <Section title="Articles" icon="📰" data={mfData.art} />
                    <Section title="Boutique" icon="🏪" data={mfData.s} />
                </div>
            </div>

            {/* EDIT MODAL */}
            {modalData && (
                <div className="modal-overlay" onClick={()=>setModalData(null)}>
                    <div className="modal-box" onClick={e=>e.stopPropagation()}>
                        <h3>Modifier la description</h3>
                        <p><strong>{modalData.name}</strong> <code style={{background:'#eee'}}>{modalData.fullKey}</code></p>
                        <textarea id="desc-input" defaultValue={modalData.description} style={{width:'100%', height:80, padding:10, marginBottom:10}} />
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <button onClick={()=>setModalData(null)} style={{padding:'8px 15px', border:'none', cursor:'pointer'}}>Annuler</button>
                            <button onClick={()=>{
                                submit({
                                    action: 'update_desc',
                                    description: (document.getElementById('desc-input') as HTMLTextAreaElement).value,
                                    id: modalData.id,
                                    ownerType: modalData.ownerType,
                                    key: modalData.fullKey,
                                    name: modalData.name
                                }, {method:'post'});
                                setModalData(null);
                            }} style={{background:'#008060', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}