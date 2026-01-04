import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// --- CSS ORIGINAL (Intégré) ---
const STYLES = `
    body { font-family: -apple-system, sans-serif; background: #f4f6f8; padding: 20px; }
    .container { max-width: 1600px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .search-box { width: 100%; padding: 15px; margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; }
    .tabs { display: flex; gap: 5px; margin-bottom: 25px; border-bottom: 2px solid #ddd; }
    .tab { padding: 12px 20px; cursor: pointer; border-radius: 8px 8px 0 0; font-weight: bold; color: #666; }
    .tab.active { background: #008060; color: #fff; }
    .tab-badge { margin-left: 5px; opacity: 0.8; font-size: 0.9em; }
    .accordion { background: #fff; cursor: pointer; padding: 15px 20px; width: 100%; border: none; text-align: left; border-bottom: 1px solid #f1f1f1; display: flex; justify-content: space-between; align-items: center; }
    .active-acc { background: #f8f9fa; border-bottom: 2px solid #008060; color: #008060; }
    .panel { display: none; }
    .main-table { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: auto; }
    th { background: #fff; padding: 12px 5px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #eee; color: #555; text-align:left; }
    td { padding: 10px 5px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: middle; }
    .type-pill { background: #f1f3f5; padding: 3px 8px; border-radius: 12px; font-size: 10px; display: inline-block; }
    .count-bubble { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 50%; font-size: 12px; }
    .img-container { width: 35px; height: 35px; position: relative; margin: 0 auto; cursor: pointer; }
    .img-container img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
    .upload-btn { cursor: pointer; font-size: 16px; display: inline-block; }
    .edit-icon { opacity: 0.6; cursor: pointer; color: #888; font-size: 16px; margin-left: 8px; }
    .btn-del { border: none; background: none; cursor: pointer; font-size: 16px; color: #999; }
    .btn-del:hover { color: red; }
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center; }
    .modal-box { background: #fff; padding: 25px; border-radius: 12px; width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
`;

// --- LOGO SVG ---
const LOGO_URI = `data:image/svg+xml;base64,${Buffer.from(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 566.9 566.9"><path fill="#E1E47D" d="M201.5,109.2c17.1-0.1,34.1,3.2,49.9,9.8c15.8,6.6,30.1,16.4,42,28.7c25.7,25.7,38.5,56.3,38.5,92v217.8h-96.6V239.6c-0.2-8.9-3.8-17.4-10.1-23.7c-6.3-6.3-14.8-9.9-23.7-10.1h-33.8v-92.5C178.7,110.6,190.1,109.2,201.5,109.2z"/><path fill="#E1E47D" d="M167.7,205.8H71.1v251.7h96.6V205.8z"/><path fill="#E1E47D" d="M365.8,109.2c17.1-0.1,34.1,3.2,49.9,9.8c15.8,6.6,30.1,16.4,42,28.7c25.7,25.7,38.5,56.3,38.5,92v217.8h-96.6V239.6c-0.2-8.9-3.8-17.4-10.1-23.7c-6.3-6.3-14.8-9.9-23.7-10.1h-33.8v-92.5C343,110.6,354.4,109.2,365.8,109.2z"/></svg>`).toString('base64')}`;

// --- LOADER (BACKEND) ---
export const loader = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);

    // 1. Charger les images locales depuis Prisma
    const localImages = await db.localImage.findMany();
    const imgMap: Record<string, string> = {};
    localImages.forEach(img => imgMap[img.id] = img.data);

    // 2. Fonctions de chargement GraphQL
    const loadMF = async (ownerType: string) => {
        const q = `#graphql
            query { metafieldDefinitions(ownerType: ${ownerType}, first: 50) { nodes { id name namespace key description type { name } metafieldsCount } } }
        `;
        try {
            const res = await admin.graphql(q);
            const json = await res.json();
            return (json.data?.metafieldDefinitions?.nodes || []).map((n: any) => ({
                ...n, kind: 'MF', ownerType, img: imgMap[n.id],
                count: n.metafieldsCount, type: n.type?.name
            }));
        } catch { return []; }
    };

    const loadMO = async () => {
        const q = `#graphql
            query { metaobjectDefinitions(first: 50) { nodes { id name type description metaobjectsCount fieldDefinitions { name key type { name } } } } }
        `;
        try {
            const res = await admin.graphql(q);
            const json = await res.json();
            return (json.data?.metaobjectDefinitions?.nodes || []).map((n: any) => ({
                ...n, kind: 'MO', ownerType: 'MO', img: imgMap[n.id],
                count: n.metaobjectsCount, fieldsCount: n.fieldDefinitions.length
            }));
        } catch { return []; }
    };

    // 3. Exécution parallèle
    const [p, v, c, cl, o, moData] = await Promise.all([
        loadMF('PRODUCT'), loadMF('PRODUCTVARIANT'), loadMF('COLLECTION'), 
        loadMF('CUSTOMER'), loadMF('ORDER'), loadMO()
    ]);

    return json({ 
        shop: (await admin.graphql(`{shop{name}}`).then(r=>r.json())).data.shop.name,
        mfData: { p, v, c, cl, o }, 
        moData 
    });
};

// --- ACTION (BACKEND MUTATIONS) ---
export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "upload_image") {
        const id = formData.get("id") as string;
        const image = formData.get("image") as string;
        await db.localImage.upsert({
            where: { id },
            update: { data: image },
            create: { id, data: image }
        });
        return json({ ok: true });
    }

    if (action === "delete_image") {
        const id = formData.get("id") as string;
        await db.localImage.delete({ where: { id } }).catch(() => {});
        return json({ ok: true });
    }

    if (action === "update_desc") {
        const id = formData.get("id") as string;
        const desc = formData.get("description") as string;
        const ownerType = formData.get("ownerType") as string;
        const name = formData.get("name") as string;
        const key = formData.get("key") as string;

        let mutation, variables;
        if (ownerType === 'MO') {
            mutation = `#graphql mutation update($id: ID!, $d: MetaobjectDefinitionUpdateInput!) { metaobjectDefinitionUpdate(id: $id, definition: $d) { userErrors { message } } }`;
            variables = { id, d: { description: desc } };
        } else {
            const [ns, ...kParts] = key.split('.');
            mutation = `#graphql mutation update($d: MetafieldDefinitionUpdateInput!) { metafieldDefinitionUpdate(definition: $d) { userErrors { message } } }`;
            variables = { d: { ownerType, namespace: ns, key: kParts.join('.'), name, description: desc } };
        }
        await admin.graphql(mutation, { variables });
        return json({ ok: true });
    }

    if (action === "delete_item") {
        const id = formData.get("id") as string;
        const type = formData.get("type") as string; // MF or MO
        const q = type === 'MF' 
            ? `#graphql mutation { metafieldDefinitionDelete(id: "${id}") { userErrors { message } } }`
            : `#graphql mutation { metaobjectDefinitionDelete(id: "${id}") { userErrors { message } } }`;
        await admin.graphql(q);
        return json({ ok: true });
    }

    return json({ ok: false });
};

// --- FRONTEND ---
export default function Index() {
    const { shop, mfData, moData } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const [activeTab, setActiveTab] = useState("mf");
    const [modalData, setModalData] = useState<any>(null);

    // Helpers
    const handleUpload = (id: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            submit({ action: "upload_image", id, image: e.target?.result as string }, { method: "post" });
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteImage = (id: string) => {
        if(confirm("Supprimer l'image ?")) submit({ action: "delete_image", id }, { method: "post" });
    };

    const handleDeleteItem = (id: string, type: string) => {
        if(confirm("Supprimer définivement cette définition ?")) submit({ action: "delete_item", id, type }, { method: "post" });
    };

    const handleSaveDesc = () => {
        if(modalData) {
            submit({ 
                action: "update_desc", 
                id: modalData.id, 
                description: (document.getElementById('desc-input') as HTMLTextAreaElement).value,
                ownerType: modalData.ownerType,
                name: modalData.name,
                key: modalData.key
            }, { method: "post" });
            setModalData(null);
        }
    };

    const renderRows = (list: any[], type: string) => {
        if(!list || list.length === 0) return <tr><td colSpan={6} style={{textAlign:'center', padding:'20px', color:'#999'}}>Aucun champ</td></tr>;
        return list.map(d => (
            <tr key={d.id}>
                <td style={{width:'40%'}}>
                    <div style={{fontWeight:'bold'}}>{d.name}</div>
                    <div style={{fontSize:'12px', color:'#666', display:'flex', alignItems:'center'}}>
                        {d.description || '-'} 
                        <span className="edit-icon" onClick={() => setModalData(d)}>✎</span>
                    </div>
                </td>
                <td style={{textAlign:'center'}}>
                    {d.img ? (
                        <div className="img-container">
                            <img src={d.img} alt="local" />
                            <span style={{position:'absolute', top:-5, right:-5, background:'white', borderRadius:'50%', cursor:'pointer'}} onClick={()=>handleDeleteImage(d.id)}>❌</span>
                        </div>
                    ) : (
                        <label className="upload-btn">📷<input type="file" hidden accept="image/*" onChange={(e)=> e.target.files && handleUpload(d.id, e.target.files[0])} /></label>
                    )}
                </td>
                <td style={{textAlign:'center'}}><strong style={{color: d.count > 0 ? '#008060' : '#ccc'}}>{d.count}</strong></td>
                <td><span className="type-pill">{d.type}</span></td>
                <td style={{fontFamily:'monospace', fontSize:'11px'}}>{d.key || d.type}</td>
                <td style={{textAlign:'center'}}><button className="btn-del" onClick={()=>handleDeleteItem(d.id, type)}>🗑️</button></td>
            </tr>
        ));
    };

    const Accordion = ({ title, icon, data }: any) => {
        const [open, setOpen] = useState(false);
        return (
            <div>
                <button className={`accordion ${open ? 'active-acc' : ''}`} onClick={()=>setOpen(!open)}>
                    <div>{icon} <strong>{title}</strong> <span className="count-bubble">{data.length}</span></div>
                    <span>{open ? '▲' : '▼'}</span>
                </button>
                <div className="panel" style={{display: open ? 'block' : 'none'}}>
                    <table className="main-table">
                        <thead><tr><th>Nom & Desc</th><th style={{textAlign:'center'}}>Img</th><th style={{textAlign:'center'}}>Vol.</th><th>Type</th><th>Clé Tech</th><th style={{textAlign:'center'}}>Act.</th></tr></thead>
                        <tbody>{renderRows(data, 'MF')}</tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div>
            <style>{STYLES}</style>
            
            <div className="container">
                <header>
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <img src={LOGO_URI} style={{width:'50px'}} alt="logo" />
                        <h1 style={{margin:0}}>MM Gestion Data</h1>
                    </div>
                    <div style={{fontSize:'12px', color:'#888'}}>Boutique : <strong>{shop}</strong></div>
                </header>

                <div className="tabs">
                    <div className={`tab ${activeTab==='mf'?'active':''}`} onClick={()=>setActiveTab('mf')}>Champs Méta (MF)</div>
                    <div className={`tab ${activeTab==='mo'?'active':''}`} onClick={()=>setActiveTab('mo')}>Objets Méta (MO)</div>
                </div>

                {activeTab === 'mf' && (
                    <div>
                        <Accordion title="Produits" icon="🛍️" data={mfData.p} />
                        <Accordion title="Variantes" icon="👕" data={mfData.v} />
                        <Accordion title="Collections" icon="📂" data={mfData.c} />
                        <Accordion title="Clients" icon="👥" data={mfData.cl} />
                        <Accordion title="Commandes" icon="📦" data={mfData.o} />
                    </div>
                )}

                {activeTab === 'mo' && (
                    <div style={{display:'block'}}>
                        <table className="main-table">
                            <thead><tr><th>Nom & Desc</th><th style={{textAlign:'center'}}>Img</th><th style={{textAlign:'center'}}>Entrées</th><th>Champs</th><th>Clé Tech</th><th style={{textAlign:'center'}}>Act.</th></tr></thead>
                            <tbody>{renderRows(moData, 'MO')}</tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalData && (
                <div className="modal-overlay" style={{display:'flex'}}>
                    <div className="modal-box">
                        <h3>Modifier la description</h3>
                        <p><strong>{modalData.name}</strong> ({modalData.key})</p>
                        <textarea id="desc-input" defaultValue={modalData.description} style={{width:'100%', height:'80px', marginBottom:'10px', padding:'10px'}}></textarea>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <button onClick={()=>setModalData(null)} style={{padding:'8px 15px', border:'none', cursor:'pointer'}}>Annuler</button>
                            <button onClick={handleSaveDesc} style={{background:'#008060', color:'white', border:'none', padding:'8px 15px', borderRadius:'4px', cursor:'pointer'}}>Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}