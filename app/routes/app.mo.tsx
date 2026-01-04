import { useState, useEffect, useRef } from "react";
import { useLoaderData, useSubmit, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- CSS ADAPTÉ DE GLOBAL.JS (identique à MF) ---
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

    /* TABLES */
    .main-table { width: 100%; border-collapse: collapse; margin: 0; table-layout: fixed; }
    th { background: #fff; padding: 12px 5px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #eee; color: #555; text-align:left; cursor: default; }
    th.sortable { cursor: pointer !important; user-select: none; }
    th.sortable:hover { background-color: #f9f9f9; }
    td { padding: 10px 5px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: middle; }
    
    /* COLONNES FIXES - Comme dans global.js */
    .col-nom-desc { width: auto; }
    .col-img, .col-vol, .col-lien, .col-del { width: 80px; text-align: center; white-space: nowrap; }
    
    /* MODE DEV */
    .col-tech, .dev-zone, .col-struct, .col-code { display: none; }
    .dev-mode .col-nom-desc { width: 30%; }
    .dev-mode .col-tech { display: table-cell; width: 20%; word-break: break-all; white-space: normal; font-family: monospace; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    .dev-mode .col-struct { display: table-cell; width: 12%; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    .dev-mode .col-code { display: table-cell; width: 80px; text-align: center; white-space: nowrap; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    .dev-mode .dev-zone { display: table-cell; background-color: #e8e8e8; border-left: 1px solid #d0d0d0; }
    
    /* EN-TÊTES CENTRÉS POUR COLONNES DEV */
    th.col-tech, th.col-struct, th.dev-zone, th.col-code { text-align: center; }
    
    /* STYLES POUR LES CELLULES */
    td.col-img, td.col-vol, td.col-lien, td.col-del, td.col-code { text-align: center; }
    td.col-tech, td.col-struct, td.dev-zone, td.col-code { background-color: #e8e8e8; }

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

    /* SUB TABLES (ENTRIES) */
    .entries-row { background: #f9fafb; }
    .mo-tools { display: flex; gap: 10px; padding: 10px; background: #e3f2fd; border-bottom: 1px solid #bbdefb; align-items: center; }
    .btn-tool { background: #fff; border: 1px solid #1976d2; color: #1976d2; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .btn-tool:hover { background: #1976d2; color: #fff; }
    .sub-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .sub-table th { background: transparent; padding: 8px; color: #888; font-weight: normal; }
    .sub-table td { padding: 8px; border-bottom: 1px solid #eee; }
    .clickable { cursor: pointer; transition: 0.2s; }
    .clickable:hover { background: #e3f2fd; }
`;

// --- DATA FAKE POUR GENERATEUR ---
const FAKE = {
    names: ["Léa", "Thomas", "Sarah", "Julien", "Emma", "Lucas", "Chloé", "Maxime", "Paul", "Julie"],
    last: ["Dubois", "Martin", "Petit", "Roux", "Moreau", "Bernard", "Simon", "Michel"],
    roles: ["Designer", "Artisan", "Couturier", "Modéliste", "Photographe", "Développeur", "Commercial"],
    bios: ["Passionné par le minimalisme.", "Expert du cuir.", "Adore les couleurs.", "Inspiré par la nature.", "Travail fait main.", "Innovation constante."]
};

// --- LOADER ---
export const loader = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    
    const localImages = await db.localImage.findMany();
    const imgMap: Record<string, string> = {};
    localImages.forEach(img => imgMap[img.id] = img.data);

    const q = `#graphql
        query { metaobjectDefinitions(first: 50) { nodes { id name type description metaobjectsCount fieldDefinitions { name key type { name } } } } }
    `;
    const res = await admin.graphql(q);
    const json = await res.json();
    const shopRes = await admin.graphql(`{ shop { name myshopifyDomain } }`);
    const shopJson = await shopRes.json();
    
    const moData = (json.data?.metaobjectDefinitions?.nodes || []).map((n: any) => ({
        ...n, kind: 'MO', 
        img: imgMap[n.id],
        count: n.metaobjectsCount,
        fieldsCount: n.fieldDefinitions.length,
        fieldsJson: JSON.stringify(n.fieldDefinitions),
        fullKey: n.type
    }));

    // Charger le nombre de MF pour l'affichage dans les tabs (même logique que dans MF loader)
    let mfCount = 0;
    try {
        const loadMF = async (ownerType: string) => {
            const q = `#graphql
                query { metafieldDefinitions(ownerType: ${ownerType}, first: 50) { nodes { id } } }
            `;
            try {
                const res = await admin.graphql(q);
                const json = await res.json();
                const count = (json.data?.metafieldDefinitions?.nodes || []).length;
                return count;
            } catch (err) {
                console.warn(`Error loading MF for ${ownerType}:`, err);
                return 0; 
            }
        };
        
        const resources = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
        const results = await Promise.all(resources.map(r => loadMF(r)));
        mfCount = results.reduce((acc, curr) => acc + curr, 0);
        console.log('MF Count calculated:', mfCount, 'Results:', results);
    } catch (e) {
        console.error("Could not fetch MF count", e);
    }

    const returnData = { 
        shop: shopJson.data.shop.name,
        shopDomain: shopJson.data.shop.myshopifyDomain,
        moData,
        mfCount
    };
    console.log('MO Loader returning:', returnData);
    return returnData;
};

// --- ACTIONS ---
export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");
    const intent = formData.get("intent");

    // 1. API: Charger les entrées (GET ENTRIES)
    if (intent === "get_entries") {
        const type = formData.get("type") as string;
        const fields = JSON.parse(formData.get("fields") as string);
        
        const q = `#graphql
            query {
                metaobjects(type: "${type}", first: 50) {
                    nodes {
                        id
                        handle
                        fields {
                            key
                            value
                        }
                    }
                }
            }
        `;
        const res = await admin.graphql(q);
        const json = await res.json();
        
        const flatNodes = (json.data?.metaobjects?.nodes || []).map((n: any) => {
            let obj: any = { id: n.id, handle: n.handle };
            const fieldsMap: Record<string, string> = {};
            n.fields?.forEach((f: any) => {
                fieldsMap[f.key] = f.value || '-';
            });
            fields.forEach((f:any) => {
                obj[f.key] = fieldsMap[f.key] || '-';
            });
            return obj;
        });
        return { ok: true, type, entries: flatNodes };
    }

    // 2. API: Générer des entrées
    if (actionType === "generate_entries") {
        const type = formData.get("type") as string;
        const count = parseInt(formData.get("count") as string) || 1;
        const fieldsDef = JSON.parse(formData.get("fields") as string);
        
        const genVal = (k: string, t: string) => {
            const kl = k.toLowerCase();
            if(kl.includes('name') || kl.includes('nom')) return `${FAKE.names[Math.floor(Math.random()*FAKE.names.length)]} ${FAKE.last[Math.floor(Math.random()*FAKE.last.length)]}`;
            if(kl.includes('role') || kl.includes('job')) return FAKE.roles[Math.floor(Math.random()*FAKE.roles.length)];
            if(kl.includes('bio') || kl.includes('desc')) return FAKE.bios[Math.floor(Math.random()*FAKE.bios.length)];
            if(t === 'boolean') return "true";
            if(t === 'number_integer') return Math.floor(Math.random()*100).toString();
            return `Auto ${Math.floor(Math.random()*1000)}`;
        };

        for(let i=0; i<count; i++) {
            let mainValue: string | null = null;
            const fieldsData = fieldsDef.map((f:any) => {
                const val = genVal(f.key, f.type?.name);
                if(!mainValue && (f.key.includes('name') || f.type?.name?.includes('text'))) mainValue = val;
                return { key: f.key, value: val };
            });

            let handle = "entry-" + Date.now();
            if(mainValue) {
                handle = mainValue.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Math.floor(Math.random()*1000);
            }

            const fieldsString = fieldsData.map((f:any) => `{key: "${f.key}", value: ${JSON.stringify(f.value)}}`).join(', ');
            const m = `#graphql mutation { metaobjectCreate(metaobject: {type: "${type}", handle: "${handle}", fields: [${fieldsString}]}) { userErrors { message } } }`;
            await admin.graphql(m);
        }
        return { ok: true, generated: true };
    }

    if (actionType === "delete_entry") {
        await admin.graphql(`#graphql mutation { metaobjectDelete(id: "${formData.get("id")}") { userErrors { message } } }`);
        return { ok: true, deleted: true };
    }

    // CRUD Images & Definition
    if (actionType === "upload_image") {
        const id = formData.get("id") as string;
        const image = formData.get("image") as string;
        await db.localImage.upsert({ where: { id }, update: { data: image }, create: { id, data: image } });
        return { ok: true };
    }
    if (actionType === "delete_image") {
        await db.localImage.delete({ where: { id: formData.get("id") as string } }).catch(()=>{});
        return { ok: true };
    }
    if (actionType === "delete_item") {
        await admin.graphql(`#graphql mutation { metaobjectDefinitionDelete(id: "${formData.get("id")}") { userErrors { message } } }`);
        return { ok: true };
    }

    // Update description
    if (actionType === "update_desc") {
        const description = formData.get("description") as string || '';
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        
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
        
        const mutation = `#graphql
            mutation {
                metaobjectDefinitionUpdate(id: "${id}", definition: {
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
        const errors = json.data?.metaobjectDefinitionUpdate?.userErrors;
        if (errors && errors.length > 0) {
            throw new Error(errors[0].message);
        }
        return { ok: true };
    }

    return { ok: false };
};

// --- COMPOSANT REACT ---
export default function AppMo() {
    const loaderData = useLoaderData<any>();
    const { shop, shopDomain, moData, mfCount = 0 } = loaderData;
    const submit = useSubmit();
    const fetcher = useFetcher<any>();
    
    // Debug: vérifier que mfCount est bien chargé
    useEffect(() => {
        console.log('MO Page - mfCount:', mfCount, 'loaderData:', loaderData);
    }, [mfCount, loaderData]);
    
    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [modalData, setModalData] = useState<any>(null);
    const [sortBy, setSortBy] = useState<'name' | 'description' | 'type' | 'count' | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [expandedEntries, setExpandedEntries] = useState<string | null>(null);
    const [expandedStruct, setExpandedStruct] = useState<string | null>(null);
    const [entriesCache, setEntriesCache] = useState<Record<string, any[]>>({});
    const [genCounts, setGenCounts] = useState<Record<string, number>>({});

    // Fonction de normalisation (comme dans global.js)
    const norm = (s: string) => {
        return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    // Fonction pour construire l'URL Shopify
    const getShopifyUrl = (type: string) => {
        const shopName = shopDomain ? shopDomain.replace('.myshopify.com', '') : '';
        return `https://admin.shopify.com/store/${shopName}/settings/custom_data/metaobjects/${type}`;
    };

    // Fonction pour générer une description depuis une clé
    const generateDescFromKey = (key: string) => {
        let clean = key.split('.').pop() || key;
        clean = clean.replace(/_/g, ' ');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    // Fonction pour auto-générer toutes les descriptions manquantes
    const autoGenerateAllMissing = async () => {
        const allData: any[] = moData.filter((d: any) => !d.description || d.description === '' || d.description === '-');

        if(allData.length === 0) {
            alert("Tout est déjà rempli !");
            return;
        }

        if(!confirm(`Générer ${allData.length} descriptions manquantes ?`)) return;

        for(let i = 0; i < allData.length; i++) {
            const mo = allData[i];
            const newDesc = generateDescFromKey(mo.type);
            await submit({
                action: 'update_desc',
                id: mo.id,
                name: mo.name,
                description: newDesc
            }, { method: 'post' });
        }

        alert(`Terminé ! ${allData.length} descriptions générées. Rechargement...`);
        setTimeout(() => window.location.reload(), 1000);
    };

    useEffect(() => { 
        setDevMode(localStorage.getItem('mm_dev_mode') === 'true'); 
    }, []);

    const toggleDev = () => {
        const newVal = !devMode;
        setDevMode(newVal);
        localStorage.setItem('mm_dev_mode', newVal ? 'true' : 'false');
    };

    // Gestion du retour fetcher
    useEffect(() => {
        if (fetcher.data?.ok && fetcher.data?.type && fetcher.data?.entries) {
            setEntriesCache(prev => ({ ...prev, [fetcher.data.type]: fetcher.data.entries }));
        }
        if (fetcher.data?.generated || fetcher.data?.deleted) {
            if(expandedEntries) {
                const def = moData.find((d:any) => d.type === expandedEntries);
                if(def) loadEntries(expandedEntries, def.fieldsJson);
            }
        }
    }, [fetcher.data]);

    const loadEntries = (type: string, fieldsJson: string) => {
        const fd = new FormData();
        fd.append("intent", "get_entries");
        fd.append("type", type);
        fd.append("fields", fieldsJson);
        fetcher.submit(fd, { method: "post" });
    };

    const handleToggleEntries = (type: string, fieldsJson: string) => {
        if (expandedEntries === type) {
            setExpandedEntries(null);
        } else {
            setExpandedEntries(type);
            loadEntries(type, fieldsJson);
        }
    };

    const handleGenerate = (type: string, fieldsJson: string) => {
        const count = genCounts[type] || 1;
        if(!confirm(`Générer ${count} entrées ?`)) return;
        const fd = new FormData();
        fd.append("action", "generate_entries");
        fd.append("type", type);
        fd.append("count", count.toString());
        fd.append("fields", fieldsJson);
        fetcher.submit(fd, { method: "post" });
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
            } else if (sortBy === 'type') {
                aVal = (a.type || '').toLowerCase();
                bVal = (b.type || '').toLowerCase();
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

    const handleSort = (field: 'name' | 'description' | 'type' | 'count') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Filtrer les données selon le dev mode
    const filteredData = moData.filter((d:any) => {
        if(!search) return true;
        
        const filter = norm(search);
        let combinedText = "";
        
        // Colonnes toujours visibles
        combinedText += (d.name || '') + " ";
        combinedText += (d.description || '') + " ";
        combinedText += (d.count || 0).toString() + " ";
        
        // Colonnes dev-zone seulement si dev mode activé
        if(devMode) {
            combinedText += (d.type || '') + " ";
        }
        
        return norm(combinedText).includes(filter);
    });

    const sortedData = sortData(filteredData);

    // Table Row Component
    const Row = ({ d }: any) => {
        const highlight = (txt: string) => {
            if(!search || !txt) return txt;
            const escTerm = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escTerm})`, 'gi');
            const parts = txt.split(regex);
            return parts.map((p,i) => norm(p) === norm(search) ? <span key={i} className="highlight">{p}</span> : p);
        };

        const fields = JSON.parse(d.fieldsJson);
        const entries = entriesCache[d.type];
        const isOpen = expandedEntries === d.type;
        const shopifyLink = getShopifyUrl(d.type);

        return (
            <>
                <tr key={d.id} style={{background: isOpen ? '#f0fdf4' : 'transparent'}}>
                    <td className="col-nom-desc" data-search-area="true">
                        <div style={{fontWeight:'bold'}}>{highlight(d.name)}</div>
                        <div style={{fontSize:12, color:'#666', display:'flex', alignItems:'center'}}>
                            {highlight(d.description || '-')}
                            <span className="edit-icon" onClick={(e)=>{e.stopPropagation(); setModalData(d)}}>✎</span>
                        </div>
                    </td>
                    <td className="col-img" data-search-area="true">
                        {d.img ? (
                            <div className="img-box">
                                <img src={d.img} alt="" />
                                <span className="del-img" onClick={()=>{if(confirm('Supprimer?')) submit({action:'delete_image', id:d.id},{method:'post'})}}>❌</span>
                            </div>
                        ) : (
                            <label style={{cursor:'pointer', fontSize:20}}>📷<input type="file" hidden accept="image/*" onChange={(e)=>e.target.files && (() => { 
                                const r=new FileReader(); r.onload=ev=>submit({action:'upload_image', id:d.id, image:ev.target?.result as string},{method:'post'}); r.readAsDataURL(e.target.files[0]);
                            })()} /></label>
                        )}
                    </td>
                    <td className="col-vol clickable sortable" data-search-area="true" onClick={()=>handleToggleEntries(d.type, d.fieldsJson)}>
                        <strong style={{color:d.count>0?'#008060':'#ccc'}}>{highlight(d.count.toString())}</strong>
                    </td>
                    <td className="col-lien">
                        <a href={shopifyLink} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none', fontSize:'18px'}} title="Ouvrir dans Shopify Admin">🔗</a>
                    </td>
                    
                    <td className="col-tech dev-zone" data-search-area="true">{highlight(d.type)}</td>
                    <td className="col-struct dev-zone clickable" data-search-area="true" onClick={()=>setExpandedStruct(expandedStruct===d.id?null:d.id)}>
                        <span className="type-pill">📌 {d.fieldsCount} Champs</span>
                    </td>
                    
                    <td className="col-code" data-search-area="true" style={{fontSize:'11px', color:'#999'}}>Non</td>
                    
                    <td className="col-del"><button className="btn-del" onClick={()=>{if(confirm('Supprimer définition ?')) submit({action:'delete_item', id:d.id}, {method:'post'})}}>🗑️</button></td>
                </tr>

                {/* STRUCTURE ROW */}
                {expandedStruct === d.id && (
                    <tr className="entries-row">
                        <td colSpan={devMode ? 8 : 6} style={{padding:0}}>
                            <div style={{padding:'10px 30px', borderLeft:'4px solid #008060'}}>
                                <table className="sub-table">
                                    {fields.map((f:any) => <tr key={f.key}><td><strong>{f.name}</strong></td><td><code>{f.key}</code></td><td>{f.type.name}</td></tr>)}
                                </table>
                            </div>
                        </td>
                    </tr>
                )}

                {/* ENTRIES ROW */}
                {isOpen && (
                    <tr className="entries-row">
                        <td colSpan={devMode ? 8 : 6} style={{padding:0}}>
                            <div style={{borderLeft:'4px solid #1976d2'}}>
                                <div className="mo-tools">
                                    <input type="number" min="1" max="50" style={{width:50, padding:4, border:'1px solid #1976d2', borderRadius:4}} 
                                        value={genCounts[d.type] || 1} onChange={e=>setGenCounts({...genCounts, [d.type]: parseInt(e.target.value)})} />
                                    <button className="btn-tool" onClick={()=>handleGenerate(d.type, d.fieldsJson)}>✨ Générer</button>
                                    <button className="btn-tool" onClick={()=>loadEntries(d.type, d.fieldsJson)}>🔄 Actualiser</button>
                                </div>
                                <div style={{padding:10, overflowX:'auto'}}>
                                    {!entries ? <div style={{color:'#999', textAlign:'center'}}>Chargement...</div> :
                                     entries.length === 0 ? <div style={{color:'#999', textAlign:'center'}}>Aucune donnée.</div> :
                                     <table className="sub-table">
                                        <thead><tr><th>Handle</th>{fields.map((f:any)=><th key={f.key}>{f.name}</th>)}<th>🗑️</th></tr></thead>
                                        <tbody>
                                            {entries.map((e:any) => (
                                                <tr key={e.id}>
                                                    <td style={{fontFamily:'monospace', fontWeight:'bold'}}>{e.handle}</td>
                                                    {fields.map((f:any) => <td key={f.key}>{typeof e[f.key]==='object'?JSON.stringify(e[f.key]):e[f.key]}</td>)}
                                                    <td><button className="btn-del" onClick={()=>{if(confirm('Supprimer entrée ?')) fetcher.submit({action:'delete_entry', id:e.id},{method:'post'})}}>🗑️</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                     </table>
                                    }
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
            </>
        );
    };

    return (
        <div className={devMode ? "dev-mode" : ""}>
            <style>{STYLES}</style>
            <div className="mm-container">
                <header className="mm-header">
                    <h1 style={{margin:0}}>MM Gestion - Objets Méta (MO)</h1>
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

                <input className="search-box" placeholder="🔍 Rechercher un objet, une clé..." value={search} onChange={e=>setSearch(e.target.value)} />

                <div className="tabs">
                    <Link to="/app/mf" className="tab-link">Champs Méta (MF) <span className="tab-badge">{mfCount || 0}</span></Link>
                    <Link to="/app/mo" className="tab-link active">Objets Méta (MO) <span className="tab-badge">{moData.length}</span></Link>
                </div>

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
                                <div onClick={(e)=>{e.preventDefault(); e.stopPropagation(); handleSort('type');}} style={{cursor: 'pointer', userSelect: 'none', display: 'inline-block', width: '100%'}}>
                                    Clé Tech
                                    {sortBy === 'type' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </div>
                            </th>
                            <th className="col-struct" align="center">Structure</th>
                            <th className="col-code" align="center">CODE</th>
                            <th className="col-del">🗑️</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length === 0 ? (
                            <tr><td colSpan={devMode ? 8 : 6} style={{textAlign:'center', padding:'20px', color:'#999'}}>Aucun objet méta trouvé.</td></tr>
                        ) : (
                            sortedData.map((d: any) => <Row key={d.id} d={d} />)
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL EDIT DESCRIPTION */}
            {modalData && (
                <div className="modal-overlay" onClick={()=>setModalData(null)}>
                    <div className="modal-box" onClick={(e)=>e.stopPropagation()}>
                        <h3>Modifier la description</h3>
                        <p>Nom: <strong>{modalData.name}</strong></p>
                        <p>Type: <code>{modalData.type}</code></p>
                        <textarea 
                            id="desc-input" 
                            defaultValue={modalData.description || ''} 
                            style={{width:'100%', height:80, padding:10, marginBottom:10}} 
                        />
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <button onClick={()=>setModalData(null)} style={{padding:'8px 15px', border:'none', cursor:'pointer'}}>Annuler</button>
                            <button onClick={()=>{
                                const desc = (document.getElementById('desc-input') as HTMLTextAreaElement).value;
                                submit({action:'update_desc', id:modalData.id, name:modalData.name, description:desc}, {method:'post'});
                                setModalData(null);
                            }} style={{background:'#008060', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
