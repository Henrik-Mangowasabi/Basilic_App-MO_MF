import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useSubmit, useFetcher, useRevalidator, useActionData, useLocation, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getMetafieldCount, getMediaCount, getMenuCount, getActiveThemeId } from "../utils/graphql-helpers.server";
import "../styles/metafields-table.css";
import { useScan } from "../components/ScanProvider";
import { AppBrand, DevModeToggle, BasilicButton, BasilicSearch, NavigationTabs, BasilicModal } from "../components/BasilicUI";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

const Icons = {
    Products: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.85091L12.6642 2.79552C14.0586 1.3957 16.2064 1.28222 17.4613 2.54206C18.7163 3.8019 18.6033 5.95797 17.2088 7.3578L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path opacity="0.5" d="M11.6281 8.33333C12.8831 9.59317 12.77 11.7492 11.3756 13.1491L9.35575 15.1768L7.33591 17.2045C5.94149 18.6043 3.79373 18.7178 2.53875 17.4579C1.28378 16.1981 1.39682 14.042 2.79124 12.6422L4.81111 10.6144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
    VerticalDots: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}><path opacity="0.5" d="M4 8C4 8.55228 3.55228 9 3 9C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7C3.55228 7 4 7.44772 4 8Z" fill="#18181B"/><path opacity="0.5" d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" fill="#18181B"/><path opacity="0.5" d="M14 8C14 8.55228 13.5523 9 13 9C12.4477 9 12 8.55228 12 8C12 7.44772 12.4477 7 13 7C13.5523 7 14 7.44772 14 8Z" fill="#18181B"/></svg>),
    Edit: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M12.739 2.62648L11.9666 3.39888L4.86552 10.4999C4.38456 10.9809 4.14407 11.2214 3.93725 11.4865C3.69328 11.7993 3.48412 12.1378 3.31346 12.4959C3.16878 12.7994 3.06123 13.1221 2.84614 13.7674L1.93468 16.5017L1.71188 17.1701C1.60603 17.4877 1.68867 17.8378 1.92536 18.0745C2.16205 18.3112 2.51215 18.3938 2.8297 18.288L3.4981 18.0652L6.23249 17.1537C6.87777 16.9386 7.20042 16.8311 7.50398 16.6864C7.86208 16.5157 8.20052 16.3066 8.51331 16.0626C8.77847 15.8558 9.01895 15.6153 9.49992 15.1343L16.601 8.03328L17.3734 7.26088C18.6531 5.98113 18.6531 3.90624 17.3734 2.62648C16.0936 1.34673 14.0187 1.34673 12.739 2.62648Z" stroke="currentColor" strokeWidth="1.5"/><path d="M11.9665 3.39884C11.9665 3.39884 12.063 5.04019 13.5113 6.48844C14.9595 7.93669 16.6008 8.03324 16.6008 8.03324M3.498 18.0651L1.93457 16.5017" stroke="currentColor" strokeWidth="1.5"/></svg>),
    Delete: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M17.0832 5H2.9165" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15.6946 7.08333L15.3113 12.8326C15.1638 15.045 15.09 16.1512 14.3692 16.8256C13.6483 17.5 12.5397 17.5 10.3223 17.5H9.67787C7.46054 17.5 6.35187 17.5 5.63103 16.8256C4.91019 16.1512 4.83644 15.045 4.68895 12.8326L4.30566 7.08333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7.9165 9.16667L8.33317 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12.0832 9.16667L11.6665 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5.4165 5C5.46307 5 5.48635 5 5.50746 4.99947C6.19366 4.98208 6.79902 4.54576 7.03252 3.90027C7.0397 3.88041 7.04706 3.85832 7.06179 3.81415L7.14269 3.57143C7.21176 3.36423 7.24629 3.26063 7.2921 3.17267C7.47485 2.82173 7.81296 2.57803 8.20368 2.51564C8.30161 2.5 8.41082 2.5 8.62922 2.5H11.3705C11.5889 2.5 11.6981 2.5 11.796 2.51564C12.1867 2.57803 12.5248 2.82173 12.7076 3.17267C12.7534 3.26063 12.7879 3.36423 12.857 3.57143L12.9379 3.81415C12.9526 3.85826 12.96 3.88042 12.9672 3.90027C13.2007 4.54576 13.806 4.98208 14.4922 4.99947C14.5133 5 14.5366 5 14.5832 5" stroke="currentColor" strokeWidth="1.5"/></svg>),
    Link: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.8509L12.6642 2.79552C14.0586 1.39569 16.2064 1.28221 17.4613 2.54205C18.7163 3.8019 18.6033 5.95797 17.2088 7.35779L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path opacity="0.5" d="M11.6278 8.33333C12.8828 9.59318 12.7698 11.7492 11.3753 13.1491L9.3555 15.1768L7.33566 17.2045C5.94124 18.6043 3.79348 18.7178 2.53851 17.4579C1.28353 16.1981 1.39658 14.042 2.79099 12.6422L4.81086 10.6145" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
    Layout: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>),
    Database: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M17.5 4.16667C17.5 5.7775 14.1421 7.08333 10 7.08333C5.85786 7.08333 2.5 5.7775 2.5 4.16667C2.5 2.55584 5.85786 1.25 10 1.25C14.1421 1.25 17.5 2.55584 17.5 4.16667Z" stroke="currentColor" strokeWidth="1.5"/><path d="M17.5 10C17.5 11.6108 14.1421 12.9167 10 12.9167C5.85786 12.9167 2.5 11.6108 2.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M17.5 15.8333C17.5 17.4442 14.1421 18.75 10 18.75C5.85786 18.75 2.5 17.4442 2.5 15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M2.5 4.16667V15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M17.5 4.16667V15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
};

const TRAD: Record<string, string> = { 'single_line_text_field': 'Texte', 'multi_line_text_field': 'Texte (multi)', 'number_integer': 'Entier', 'number_decimal': 'Décimal', 'boolean': 'Booléen', 'url': 'Url', 'json': 'JSON', 'date': 'Date', 'date_time': 'Date Heure', 'color': 'Couleur', 'weight': 'Poids', 'volume': 'Volume', 'dimension': 'Dimension', 'rating': 'Note', 'money': 'Argent', 'file_reference': 'Fichier', 'product_reference': 'Produit', 'variant_reference': 'Variante', 'collection_reference': 'Collection', 'page_reference': 'Page', 'customer_reference': 'Client', 'metaobject_reference': 'Métaobjet' };
const translateType = (t: string) => (!t ? '-' : t.startsWith('list.') ? `Liste ${TRAD[t.replace('list.', '')] || t.replace('list.', '')}` : TRAD[t] || t);

export const loader = async ({ request }: any) => {
    const { admin, session } = await authenticate.admin(request);

    // OPTIMISATION: Récupérer shop domain et thème ID en parallèle avec les metaobjects
    const shopPromise = admin.graphql(`{ shop { myshopifyDomain } }`).then(r => r.json()).then(j => j?.data?.shop?.myshopifyDomain || '');
    const themePromise = getActiveThemeId(admin);
    
    // Fetch metaobject definitions
    const moDefsPromise = (async () => {
        let allMoNodes: any[] = [];
        let hasNextMoPage = true;
        let moCursor: string | null = null;
        
        while (hasNextMoPage) {
            const moRes = await admin.graphql(`
                query getMetaobjectDefinitions($cursor: String) {
                    metaobjectDefinitions(first: 250, after: $cursor) {
                        pageInfo { hasNextPage endCursor }
                        nodes {
                            id name type description metaobjectsCount
                            fieldDefinitions { name key type { name } required validations { name value } }
                        }
                    }
                }
            `, { variables: { cursor: moCursor } });
            
            const moJson: any = await moRes.json();
            const data = moJson.data?.metaobjectDefinitions;
            
            if (data?.nodes?.length) {
                allMoNodes = [...allMoNodes, ...data.nodes];
            }
            hasNextMoPage = data?.pageInfo?.hasNextPage || false;
            moCursor = data?.pageInfo?.endCursor || null;
            if (moJson.errors || allMoNodes.length >= 10000) break;
        }
        return allMoNodes;
    })();

    // Attendre le domain pour les autres requêtes
    const shopDomain = await shopPromise;
    const activeThemeId = await themePromise;
    
    // OPTIMISATION: Lancer counts, templates et menuCount en parallèle
    const [allMoNodes, mfCount, mediaCount, totalTemplates, menuCount] = await Promise.all([
        moDefsPromise,
        getMetafieldCount(admin, shopDomain),
        getMediaCount(admin, shopDomain),
        (async () => {
            if (!activeThemeId) return 0;
            const assetsRes = await fetch(`https://${shopDomain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`, {
                headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
            });
            const assetsJson = await assetsRes.json();
            const managedTypes = ['product', 'collection', 'page', 'blog', 'article'];
            return (assetsJson.assets || []).filter((a: any) => {
                if (!a.key.startsWith('templates/') || !a.key.endsWith('.json')) return false;
                const type = a.key.replace('templates/', '').split('.')[0];
                return managedTypes.includes(type);
            }).length;
        })(),
        getMenuCount(admin, shopDomain)
    ]);

    const moData = allMoNodes.map((n: any) => ({ 
        ...n, 
        count: n.metaobjectsCount, 
        fieldsCount: n.fieldDefinitions.length, 
        fieldDefinitions: n.fieldDefinitions.map((f: any) => ({ ...f, typeDisplay: translateType(f.type?.name) })), 
        fullKey: n.type, 
        code_usage: 'Non' as string 
    }));

    // Review status avec index optimisé
    let reviewStatusMap: Record<string, "to_review" | "reviewed"> = {};
    try {
        const reviewRows = await db.itemReviewStatus.findMany({
            where: { shop: shopDomain, source: "mo" },
            select: { itemId: true, status: true }
        });
        reviewRows.forEach((r: { itemId: string; status: string }) => { reviewStatusMap[r.itemId] = r.status as "to_review" | "reviewed"; });
    } catch {
        // Table absente
    }

    return {
        shopDomain,
        moData,
        mfCount,
        moCount: moData.length,
        totalTemplates,
        mediaCount,
        menuCount,
        reviewStatusMap,
    };
};

export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");
    if (formData.get("intent") === "get_entries") { 
        const type = formData.get("type") as string; 
        const res = await admin.graphql(`
            query GetMOEntries($type: String!) { 
                metaobjects(type: $type, first: 50) { 
                    nodes { 
                        id 
                        handle 
                        displayName 
                        referencedBy(first: 250) { 
                            edges { 
                                node { 
                                    __typename 
                                } 
                            } 
                        } 
                        fields { 
                            key 
                            value 
                        } 
                    } 
                } 
            }
        `, { variables: { type } }); 
        const json = await res.json(); 
        const entries = (json.data?.metaobjects?.nodes || []).map((n: any) => { 
            let obj: any = { 
                id: n.id, 
                handle: n.handle, 
                displayName: n.displayName || n.handle, 
                refCount: n.referencedBy?.edges?.length || 0 
            }; 
            n.fields?.forEach((f: any) => { 
                obj[f.key] = f.value || '-'; 
            }); 
            return obj; 
        }); 
        return { ok: true, type, entries }; 
    }
    if (actionType === "update_desc") { await admin.graphql(`mutation UpdateMOD($id: ID!, $name: String!, $description: String) { metaobjectDefinitionUpdate(id: $id, definition: { name: $name, description: $description }) { userErrors { message field } } }`, { variables: { id: formData.get("id"), name: formData.get("name"), description: formData.get("description") } }); return { ok: true }; }
    if (actionType === "update_fields") { const fields = JSON.parse(formData.get("fields") as string); await admin.graphql(`mutation UpdateFields($id: ID!, $fields: [MetaobjectFieldDefinitionOperationInput!]!) { metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fields }) { userErrors { message field } } }`, { variables: { id: formData.get("id"), fields } }); return { ok: true }; }
    if (actionType === "delete_item") { const ids = JSON.parse(formData.get("ids") as string || "[]"); for (const id of ids) await admin.graphql(`mutation DeleteMOD($id: ID!) { metaobjectDefinitionDelete(id: $id) { userErrors { message } } }`, { variables: { id } }); return { ok: true }; }
    if (actionType === "delete_entry") { await admin.graphql(`mutation DeleteMO($id: ID!) { metaobjectDelete(id: $id) { userErrors { message } } }`, { variables: { id: formData.get("id") } }); return { ok: true }; }
    if (actionType === "delete_entries") { const ids = JSON.parse(formData.get("ids") as string || "[]"); for (const id of ids) await admin.graphql(`mutation DeleteMO($id: ID!) { metaobjectDelete(id: $id) { userErrors { message } } }`, { variables: { id } }); return { ok: true }; }
    if (actionType === "create_entry") {
        const type = formData.get("type") as string;
        const fieldsData = JSON.parse(formData.get("fields") as string);

        const LOREM_SHORT = "Lorem ipsum dolor sit amet.";
        const LOREM_2LINES = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
        const RICH_HTML = "<p>Lorem ipsum <strong>dolor sit amet</strong>, <em>consectetur adipiscing elit</em>. <a href=\"https://example.com\">Lien exemple</a>.</p><ul><li>Premier point</li><li>Deuxième point</li></ul><p>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>";

        const getFirstChoice = (f: any): string | null => {
            const validations = f.validations as Array<{ name: string; value: string | string[] }> | undefined;
            if (!validations?.length) return null;
            const choicesVal = validations.find((v: any) => v.name === "choices");
            if (!choicesVal?.value) return null;
            const arr = typeof choicesVal.value === "string" ? (() => { try { return JSON.parse(choicesVal.value); } catch { return null; } })() : choicesVal.value;
            return Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : null;
        };

        const isTitleField = (f: any) => {
            const k = (f.key || "").toLowerCase();
            const n = (f.name || "").toLowerCase();
            return k === "title" || k === "titre" || k === "name" || n.includes("titre") || n.includes("titre ");
        };

        const isEmailField = (f: any) => {
            const k = (f.key || "").toLowerCase();
            const n = (f.name || "").toLowerCase();
            const s = k + " " + n;
            return /email|mail|courriel|e-mail/.test(s) || k === "email" || k === "mail";
        };

        const isIdentificationField = (f: any) => {
            const k = (f.key || "").toLowerCase();
            const n = (f.name || "").toLowerCase();
            const s = k + " " + n;
            return /identification|identifiant|id_client|id_utilisateur|id_contact|numero_client|numéro_client/.test(s) || k === "identification" || k === "identifiant";
        };

        const isIdCodeField = (f: any) => {
            const k = (f.key || "").toLowerCase();
            const n = (f.name || "").toLowerCase();
            if (isIdentificationField(f)) return false;
            const s = k + " " + n;
            return /^id$|^code$|^ref$|^sku$|^handle$|^slug$|^numero$|^numéro$|^reference$/.test(k) || /\b(id|code|ref|sku|handle|slug|numéro|numero)\b/.test(s);
        };

        const uniqueSuffix = () => "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

        const fields = fieldsData.map((f: any) => {
            let val: string;
            const t = (f.type?.name || "").toLowerCase();

            if (t.includes("reference") && !t.includes("list.")) return null;

            if (t === "single_line_text_field") {
                const firstChoice = getFirstChoice(f);
                if (firstChoice != null) val = firstChoice;
                else if (isTitleField(f)) val = "Exemple titre";
                else if (isEmailField(f)) val = "email.exemple@gmail.com";
                else if (isIdentificationField(f)) val = "identification exemple-" + uniqueSuffix();
                else if (isIdCodeField(f)) val = "1234";
                else val = LOREM_SHORT;
            } else if (t === "multi_line_text_field") {
                val = LOREM_2LINES;
            } else if (t === "rich_text_field") {
                val = RICH_HTML;
            } else if (t.includes("number_integer")) {
                const numVal = isIdCodeField(f) ? "1234" : "42";
                val = t.startsWith("list.") ? JSON.stringify([42, 100]) : numVal;
            } else if (t.includes("number_decimal")) {
                val = t.startsWith("list.") ? JSON.stringify([19.99, 5.5]) : "19.99";
            } else if (t.includes("boolean")) val = "true";
            else if (t.includes("date_time")) val = new Date().toISOString();
            else if (t.includes("date")) val = new Date().toISOString().split("T")[0];
            else if (t.includes("url")) val = "https://example.com";
            else if (t.includes("email")) val = "email.exemple@gmail.com";
            else if (t.includes("json")) val = "{}";
            else if (t.includes("color")) val = "#4BB961";
            else if (t.includes("rating")) val = JSON.stringify({ value: 4, scale_min: 1, scale_max: 5 });
            else if (t.includes("money")) val = JSON.stringify({ amount: "19.99", currency_code: "EUR" });
            else if (t.includes("weight")) val = JSON.stringify({ value: 1, unit: "KILOGRAMS" });
            else if (t.includes("dimension")) val = JSON.stringify({ value: 10, unit: "CENTIMETERS" });
            else if (t.includes("volume")) val = JSON.stringify({ value: 1, unit: "LITERS" });
            else if (t.includes("file_reference")) return null;
            else if (t.includes("reference")) return null;
            else if (t.startsWith("list.single_line_text_field")) val = JSON.stringify(["Lorem ipsum", "Dolor sit amet"]);
            else if (t.startsWith("list.multi_line_text_field")) val = JSON.stringify([LOREM_SHORT, LOREM_SHORT]);
            else if (t.startsWith("list.rich_text_field")) val = JSON.stringify([RICH_HTML]);
            else if (t.startsWith("list.boolean")) val = JSON.stringify(["true", "false"]);
            else if (t.startsWith("list.date")) val = JSON.stringify([new Date().toISOString().split("T")[0]]);
            else if (t.startsWith("list.url")) val = JSON.stringify(["https://example.com"]);
            else if (t.startsWith("list.color")) val = JSON.stringify(["#4BB961", "#3B82F6"]);
            else {
                val = LOREM_SHORT;
            }
            return { key: f.key, value: val };
        }).filter(Boolean);
        const res = await admin.graphql(`mutation CreateMO($mo: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $mo) { metaobject { id handle displayName referencedBy(first: 1) { edges { node { __typename } } } fields { key value } } userErrors { message } } }`, { variables: { mo: { type, fields } } });
        const json = await res.json();
        const mo = json.data?.metaobjectCreate?.metaobject;
        if (!mo) return { ok: false, error: json.data?.metaobjectCreate?.userErrors?.[0]?.message };
        let entry: any = { id: mo.id, handle: mo.handle, displayName: mo.displayName, refCount: mo.referencedBy?.edges?.length || 0 };
        mo.fields?.forEach((f: any) => { entry[f.key] = f.value || '-'; });
        return { ok: true, entry };
    }
    if (actionType === "set_review_status") {
        try {
            const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
            const shopJson = await shopRes.json();
            const shop = shopJson.data?.shop?.myshopifyDomain;
            if (!shop) return { ok: false, errors: [{ message: "Shop non trouvé" }] };
            const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];
            const status = (formData.get("status") as string) as "to_review" | "reviewed";
            if (!ids.length || !status || !["to_review", "reviewed"].includes(status)) return { ok: false, errors: [{ message: "Paramètres invalides" }] };
            for (const itemId of ids) {
                await db.itemReviewStatus.upsert({
                    where: { shop_itemId_source: { shop, itemId, source: "mo" } },
                    create: { shop, itemId, status, source: "mo" },
                    update: { status }
                });
            }
            return { ok: true, action: "set_review_status" };
        } catch (e) {
            return { ok: false, errors: [{ message: "Base de données non prête. Lancez: npx prisma generate puis npx prisma db push" }] };
        }
    }
    if (actionType === "clear_review_status") {
        try {
            const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
            const shopJson = await shopRes.json();
            const shop = shopJson.data?.shop?.myshopifyDomain;
            if (!shop) return { ok: false, errors: [{ message: "Shop non trouvé" }] };
            const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];
            if (!ids.length) return { ok: false, errors: [{ message: "Aucun id" }] };
            await db.itemReviewStatus.deleteMany({ where: { shop, itemId: { in: ids }, source: "mo" } });
            return { ok: true, action: "clear_review_status" };
        } catch (e) {
            return { ok: false, errors: [{ message: "Base de données non prête. Lancez: npx prisma generate puis npx prisma db push" }] };
        }
    }
    return null;
};

export default function AppMo() {
    const { shopDomain, moData, mfCount, moCount, totalTemplates, mediaCount, menuCount, reviewStatusMap } = useLoaderData<any>();
    const location = useLocation();
    const navigation = useNavigation();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[] } | null>();
    const submit = useSubmit();
    const fetcher = useFetcher();
    const revalidator = useRevalidator();
    
    // Utiliser le contexte de scan global
    const { isScanning, moResults, startScan } = useScan();
    
    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [modalData, setModalData] = useState<any>(null);
    const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [entriesModalData, setEntriesModalData] = useState<any>(null);
    const [entriesCache, setEntriesCache] = useState<Record<string, any[]>>({});
    const [isEntriesLoading, setIsEntriesLoading] = useState(false);
    const [structModalData, setStructModalData] = useState<any>(null);
    const [toast, setToast] = useState<{title: string, message: string} | null>(null);
    const [isDeletingEntry, setIsDeletingEntry] = useState<string | null>(null);
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const [entryDeleteConfirmOpen, setEntryDeleteConfirmOpen] = useState(false);
    const [isDeletingEntries, setIsDeletingEntries] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [isSavingMO, setIsSavingMO] = useState(false);
    const [selectedField, setSelectedField] = useState<any>(null);
    const [pendingFieldChanges, setPendingFieldChanges] = useState<Record<string, { name: string, required: boolean }>>({});
    const [isSavingField, setIsSavingField] = useState(false);
    const [isGeneratingEntry, setIsGeneratingEntry] = useState(false);
    const [autoGenModalOpen, setAutoGenModalOpen] = useState(false);
    const [autoGenCount, setAutoGenCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationComplete, setGenerationComplete] = useState(false);
    const [isTableOpen, setIsTableOpen] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });

    useEffect(() => { setDevMode(localStorage.getItem('mm_dev_mode') === 'true'); }, []);

    useEffect(() => {
        if (!actionData?.ok || !actionData?.action) return;
        if (actionData.action === "set_review_status" || actionData.action === "clear_review_status") {
            setSelectedKeys(new Set([]));
            setToast({ title: "Statut mis à jour", message: "Les lignes ont été marquées." });
            setTimeout(() => setToast(null), 3000);
            revalidator.revalidate();
        }
    }, [actionData, revalidator]);
    const toggleDev = (val: boolean) => { setDevMode(val); localStorage.setItem('mm_dev_mode', val ? 'true' : 'false'); };
    const storeSlug = shopDomain.replace('.myshopify.com', '');
    const getShopifyUrl = (type: string) => `https://admin.shopify.com/store/${storeSlug}/settings/custom_data/metaobjects/${type}`;
    const getEntryUrl = (type: string, id: string) => `https://admin.shopify.com/store/${storeSlug}/content/metaobjects/entries/${type}/${id.split('/').pop()}`;
    const newMoUrl = `https://admin.shopify.com/store/${storeSlug}/settings/custom_data/metaobjects/create`;
    const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    useEffect(() => { 
        if (fetcher.data?.ok) {
            if (fetcher.data.entries) {
                setEntriesCache(prev => ({ ...prev, [fetcher.data.type]: fetcher.data.entries })); 
                setIsEntriesLoading(false); 
            } else if (fetcher.data.entry && entriesModalData) {
                setEntriesCache(prev => ({ ...prev, [entriesModalData.type]: [fetcher.data.entry, ...(prev[entriesModalData.type] || [])] }));
                setIsGeneratingEntry(false);
                setToast({ title: "Entrée générée", message: "Une nouvelle entrée de test a été ajoutée." });
                setTimeout(() => setToast(null), 3000);
            } else if (fetcher.data.ok && !fetcher.data.entry && !fetcher.data.entries) {
                // Batch delete success
                if (entriesModalData) {
                    setEntriesCache(prev => ({
                        ...prev,
                        [entriesModalData.type]: prev[entriesModalData.type].filter((item: any) => !selectedEntryIds.has(item.id))
                    }));
                }
                setSelectedEntryIds(new Set());
                setIsDeletingEntries(false);
                setEntryDeleteConfirmOpen(false);
                setToast({ title: "Entrées supprimées", message: "Les données sélectionnées ont été retirées." });
                setTimeout(() => setToast(null), 3000);
            }
        } else if (fetcher.data?.ok === false) {
            setIsGeneratingEntry(false);
            setToast({ title: "Erreur", message: fetcher.data.error || "Impossible de générer l'entrée." });
            setTimeout(() => setToast(null), 5000);
        }
    }, [fetcher.data, entriesModalData]);

    const handleOpenEntries = (item: any) => { setEntriesModalData(item); setSelectedEntryIds(new Set()); if (!entriesCache[item.type]) { setIsEntriesLoading(true); const fd = new FormData(); fd.append("intent", "get_entries"); fd.append("type", item.type); fd.append("fields", JSON.stringify(item.fieldDefinitions)); fetcher.submit(fd, { method: "post" }); } };

    const checkAutoGenerate = () => { setAutoGenCount(moData.filter((d: any) => !d.description || d.description === "" || d.description === "-").length); setGenerationComplete(false); setAutoGenModalOpen(true); };
    const confirmAutoGenerate = async () => { setIsGenerating(true); const missing = moData.filter((d: any) => !d.description || d.description === "" || d.description === "-"); for (const item of missing) { let desc = (item.type.split('.').pop() || item.type).replace(/_/g, ' '); desc = desc.charAt(0).toUpperCase() + desc.slice(1); await submit({ action: 'update_desc', id: item.id, name: item.name, description: desc }, { method: 'post' }); } setIsGenerating(false); setGenerationComplete(true); setToast({ title: "Descriptions générées", message: `${missing.length} descriptions créées.` }); setTimeout(() => { setToast(null); setAutoGenModalOpen(false); }, 3000); };

    const handleSort = (columnKey: string) => {
        setSortConfig(prev => {
            if (prev.column === columnKey) {
                return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                return { column: columnKey, direction: 'asc' };
            }
        });
    };

    const sortData = (data: any[]) => {
        if (!sortConfig.column) return data;
        
        const sorted = [...data].sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';
            
            switch (sortConfig.column) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                case 'count':
                    aVal = a.count || 0;
                    bVal = b.count || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    };

    const columns = [
        { 
            key: "name", 
            label: (
                <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none" 
                    onClick={(e) => { e.stopPropagation(); handleSort('name'); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSort('name'); } }}
                    role="button"
                    tabIndex={0}
                >
                    <span>NOM DE L&apos;OBJET</span>
                    {sortConfig.column === 'name' ? (
                        <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 12 12" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            className={`text-[#71717A] ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
                        >
                            <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 12 12" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.5"
                            className="text-[#A1A1AA] opacity-50"
                        >
                            <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </div>
            ), 
            className: "mf-col--name" 
        },
        ...(devMode ? [
            { key: "fullKey", label: (<div className="relative overflow-visible"><div className="mf-dev-badge"><span>&lt;/&gt;</span> Dev Mode <a href={newMoUrl} target="_blank" rel="noopener noreferrer" className="mf-dev-badge__new" onClick={(e: React.MouseEvent) => e.stopPropagation()}>+ Nouveau</a></div>CLÉ TECH</div>), className: "mf-col--key mf-table__header--dev" },
            { key: "fields", label: "CHAMPS", className: "mf-col--type mf-table__header--dev" },
            { key: "code_usage", label: "CODE", className: "mf-col--code mf-table__header--dev" },
            { key: "count", label: "ENTRÉES", className: "mf-col--count mf-table__header--dev" }
        ] : [
            { key: "count", label: "ENTRÉES", className: "mf-col--count" }
        ]),
        { key: "actions", label: "LIEN", className: "mf-col--actions" },
        { key: "menu", label: " ", className: "mf-col--menu" }
    ];

    const renderCell = (item: any, columnKey: React.Key) => {
        switch (columnKey) {
            case "name": return (<div className="mf-cell mf-cell--multi"><span className="mf-text--title">{item.name}</span>{item.description && <span className="mf-text--desc">{item.description}</span>}</div>);
            case "fullKey": return (<div className="mf-cell mf-cell--key"><span className="mf-text--key">{item.type}</span></div>);
            case "fields": return (<div className="mf-cell mf-cell--type"><div className="mf-chip cursor-pointer hover:bg-[#E4E4E7] transition-colors" onClick={() => { setStructModalData(item); setSelectedField(null); setPendingFieldChanges({}); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStructModalData(item); setSelectedField(null); setPendingFieldChanges({}); } }}>{item.fieldsCount} Champs</div></div>);
            case "code_usage": {
                const inCode = moResults.size > 0 ? moResults.has(item.type) : (item.code_usage === 'Oui');
                return (<div className="mf-cell mf-cell--center mf-cell--badge"><span className={`mf-badge--code ${inCode ? 'mf-badge--found' : ''}`}>{inCode ? 'Oui' : 'Non'}</span></div>);
            }
            case "count": return (<div className="mf-cell mf-cell--center"><button onClick={() => handleOpenEntries(item)} className="mf-badge--count hover:bg-[#E4E4E7] transition-colors cursor-pointer">{item.count}</button></div>);
            case "actions": return (<div className="mf-cell mf-cell--center"><Tooltip content="Ouvrir"><a href={getShopifyUrl(item.type)} target="_blank" rel="noopener noreferrer" className="mf-action-link"><Icons.Link /></a></Tooltip></div>);
            case "menu": return (<div className="mf-cell mf-cell--center"><Dropdown classNames={{ content: "mf-dropdown-content" }}><DropdownTrigger><Button isIconOnly variant="light" size="sm" className="min-w-unit-8 w-8 h-8"><Icons.VerticalDots /></Button></DropdownTrigger><DropdownMenu aria-label="Actions" onAction={(k) => { if (k === 'edit') { setEditName(item.name); setEditDesc(item.description || ""); setModalData(item); } else if (k === 'struct') { setStructModalData(item); setSelectedField(null); setPendingFieldChanges({}); } else if (k === 'entries') handleOpenEntries(item); else if (k === 'delete') { setPendingDeleteIds([item.id]); setDeleteConfirmOpen(true); } }}><DropdownItem key="edit" startContent={<Icons.Edit size={16} />} className="mf-dropdown-item"><span className="mf-dropdown-item__title">Editer</span></DropdownItem><DropdownItem key="struct" startContent={<Icons.Layout size={16} />} className="mf-dropdown-item"><span className="mf-dropdown-item__title">Gérer champs</span></DropdownItem><DropdownItem key="entries" startContent={<Icons.Database size={16} />} className="mf-dropdown-item"><span className="mf-dropdown-item__title">Gérer entrées</span></DropdownItem><DropdownItem key="delete" startContent={<Icons.Delete size={16} />} className="mf-dropdown-item mf-dropdown-item--delete"><span className="mf-dropdown-item__title">supprimer</span></DropdownItem></DropdownMenu></Dropdown></div>);
            default: return null;
        }
    };

    const filteredData = useMemo(() => {
        if (!search?.trim()) return moData;
        const s = norm(search.trim());
        return moData.filter((d: any) => 
            norm(d.name).includes(s) || 
            norm(d.type).includes(s) || 
            (d.description && norm(d.description).includes(s))
        );
    }, [search, moData]);

    return (
        <>
            <div className="min-h-screen bg-white animate-in fade-in duration-500">
            <div className="mx-auto px-6 pt-6 pb-32 space-y-6" style={{ maxWidth: "1800px" }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]"><AppBrand /><div className="flex gap-3 items-center"><DevModeToggle isChecked={devMode} onChange={toggleDev} /><BasilicButton 
                    variant="flat" 
                    className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]" 
                    isLoading={isScanning}
                    onPress={() => { 
                        setSelectedKeys(new Set()); 
                        startScan();
                    }} 
                    icon={isScanning ? null : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>}
                >
                    Scan Code
                </BasilicButton><BasilicButton onPress={checkAutoGenerate} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}>Générer descriptions manquantes</BasilicButton></div></div>
                <div className="flex items-center justify-between w-full"><NavigationTabs activePath="/app/mo" counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount }} /><div style={{ width: '320px' }}><BasilicSearch value={search} onValueChange={setSearch} placeholder="Search" /></div></div>
                {search && filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#F4F4F5]/50 rounded-[32px] border-2 border-dashed border-[#E4E4E7] animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <div className="text-[17px] font-semibold text-[#18181B]">Aucun résultat de recherche pour &quot;<span className="text-[#E11D48]">{search}</span>&quot;</div>
                        <div className="text-[14px] text-[#71717A] mt-1.5">Nous n&apos;avons rien trouvé correspondant à votre recherche.</div>
                    </div>
                ) : (
                    <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className={`mf-section__header ${isTableOpen ? 'mf-section__header--open' : ''}`} onClick={() => setIsTableOpen(!isTableOpen)}><div className="mf-section__title-group"><Icons.Products className="mf-section__icon" /><span className="mf-section__title">{search ? 'Résultats de recherche' : 'Tous les Objets Méta'}</span><span className="mf-section__count">{filteredData.length}</span></div><div className="mf-section__arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${isTableOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg></div></div>
                        {isTableOpen && (<div className="mf-table__base animate-in fade-in zoom-in-95 duration-300"><Table aria-label="Table des objets" removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys as any} className="mf-table" classNames={{ wrapper: "mf-table__wrapper", th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`, td: "mf-table__cell", tr: "mf-table__row" }}><TableHeader columns={columns}>{(column: any) => (<TableColumn key={column.key} align={column.key === "count" || column.key === "actions" || column.key === "menu" ? "center" : "start"} className={column.className}>{column.label}</TableColumn>)}</TableHeader><TableBody items={sortData(filteredData)} emptyContent={<div className="mf-empty">Aucun objet trouvé.</div>}>{(item: any) => (<TableRow key={item.id} className={reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.id] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}</TableRow>)}</TableBody></Table></div>)}
                    </div>
                )}
            </div>

            {selectedKeys.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-2xl ring-1 ring-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-[14px] font-medium text-white">{selectedKeys.size} sélectionnés</span>
                            <button onClick={() => setSelectedKeys(new Set([]))} className="text-[#A1A1AA] hover:text-white transition-colors" aria-label="Tout désélectionner">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><g opacity="0.8"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6023 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6023 5.39763 18.3333 10 18.3333Z" fill="#3F3F46"/><path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></g></svg>
                            </button>
                        </div>
                        <div className="h-6 w-[1px] bg-[#3F3F46]"></div>
                        <Button onPress={() => { const fd = new FormData(); fd.append("action", "set_review_status"); fd.append("ids", JSON.stringify(Array.from(selectedKeys).map(k => String(k)))); fd.append("status", "to_review"); submit(fd, { method: "post" }); }} className="bg-[#71717A] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#52525B] transition-colors gap-2">À review</Button>
                        <Button onPress={() => { const fd = new FormData(); fd.append("action", "set_review_status"); fd.append("ids", JSON.stringify(Array.from(selectedKeys).map(k => String(k)))); fd.append("status", "reviewed"); submit(fd, { method: "post" }); }} className="bg-[#3F3F46] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#27272A] transition-colors gap-2">Review</Button>
                        <Button onPress={() => { const fd = new FormData(); fd.append("action", "clear_review_status"); fd.append("ids", JSON.stringify(Array.from(selectedKeys).map(k => String(k)))); submit(fd, { method: "post" }); }} variant="flat" className="text-[#A1A1AA] font-medium px-4 h-[36px] rounded-full hover:bg-white/10 hover:text-white transition-colors">Réinitialiser</Button>
                        <div className="h-6 w-[1px] bg-[#3F3F46]"></div>
                        <Button onPress={() => { setPendingDeleteIds(Array.from(selectedKeys).map(k => String(k))); setDeleteConfirmOpen(true); }} className="bg-[#F43F5E] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#E11D48] transition-colors gap-2" startContent={<Icons.Delete />}>supprimer</Button>
                    </div>
                </div>
            )}

            {/* MODALE : ÉDITION DE L'OBJET (Titre / Description) */}
            <BasilicModal 
                isOpen={!!modalData} 
                onClose={() => setModalData(null)} 
                title="Modification de l'objet" 
                footer={
                    <>
                        <Button variant="light" onPress={() => setModalData(null)} className="grow bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-11">Annuler</Button>
                        <BasilicButton 
                            className="grow h-11" 
                            onPress={async () => { 
                                setIsSavingMO(true);
                                await submit({ action: 'update_desc', id: modalData.id, name: editName, description: editDesc }, { method: 'post' }); 
                                setIsSavingMO(false);
                                setModalData(null); 
                                setToast({ title: "Mis à jour", message: "Les informations de l'objet ont été enregistrées." });
                                setTimeout(() => setToast(null), 3000);
                            }}
                            isLoading={isSavingMO}
                        >
                            Sauvegarder
                        </BasilicButton>
                    </>
                }
            >
                <div className="space-y-5 pt-2">
                    <div className="space-y-1.5">
                        <label htmlFor="edit-mo-name" className="text-[13px] font-bold text-[#71717A] uppercase tracking-wider">Titre de l&apos;objet</label>
                        <input 
                            id="edit-mo-name" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)} 
                            className="w-full h-11 px-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] font-semibold" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="edit-mo-desc" className="text-[13px] font-bold text-[#71717A] uppercase tracking-wider">Description</label>
                        <textarea 
                            id="edit-mo-desc" 
                            value={editDesc} 
                            onChange={e => setEditDesc(e.target.value)} 
                            className="w-full h-32 p-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] font-medium resize-none"
                            placeholder="Entrez une description pour cet objet..."
                        />
                    </div>
                </div>
            </BasilicModal>

            {/* MODALE : CONFIGURATION DES CHAMPS */}
            <BasilicModal 
                isOpen={!!structModalData} 
                size="lg" 
                onClose={() => setStructModalData(null)} 
                title={
                    <div className="flex flex-col gap-1">
                        <div className="text-[20px] font-semibold text-[#18181B]">
                            {structModalData?.name}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] text-[#71717A] font-normal">Configuration des champs</span>
                            <span className="px-2 py-0.5 bg-[#F4F4F5] rounded-full text-[12px] text-[#71717A] font-medium">
                                {structModalData?.fieldDefinitions.length}
                            </span>
                        </div>
                    </div>
                }
                footer={
                    <>
                        <Button variant="light" onPress={() => setStructModalData(null)} className="grow bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-11">Annuler</Button>
                        {Object.keys(pendingFieldChanges).length > 0 && (
                            <BasilicButton 
                                className="grow h-11" 
                                isLoading={isSavingField}
                                onPress={async () => {
                                    setIsSavingField(true);
                                    const fieldsToUpdate = Object.entries(pendingFieldChanges).map(([key, data]) => ({ 
                                        update: { key, name: data.name, required: data.required } 
                                    }));
                                    await submit({ action: 'update_fields', id: structModalData.id, fields: JSON.stringify(fieldsToUpdate) }, { method: 'post' });
                                    setIsSavingField(false);
                                    setStructModalData(null);
                                    setToast({ title: "Structure mise à jour", message: "Tous les changements ont été enregistrés." });
                                    setTimeout(() => setToast(null), 3000);
                                }}
                            >
                                Enregistrer les modifications ({Object.keys(pendingFieldChanges).length})
                            </BasilicButton>
                        )}
                        {Object.keys(pendingFieldChanges).length === 0 && (
                            <Button variant="light" onPress={() => setStructModalData(null)} className="grow bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-11">Fermer</Button>
                        )}
                    </>
                }
            >
                <div className="space-y-6 py-2">
                    {selectedField && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="p-5 bg-[#4BB961]/5 border border-[#4BB961]/20 rounded-[18px] space-y-5 shadow-inner">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-extrabold text-[#4BB961] uppercase tracking-[0.15em]">Édition du champ</div>
                                        </div>
                                        <button onClick={() => setSelectedField(null)} className="p-1.5 rounded-full hover:bg-white/50 text-[#A1A1AA] hover:text-[#18181B] transition-all" aria-label="Fermer l'édition">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label htmlFor="field-edit-name" className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Nom affiché</label>
                                            <input 
                                                id="field-edit-name"
                                                value={pendingFieldChanges[selectedField.key]?.name ?? selectedField.name}
                                                onChange={e => {
                                                    const newName = e.target.value;
                                                    setPendingFieldChanges(prev => ({ ...prev, [selectedField.key]: { name: newName, required: prev[selectedField.key]?.required ?? selectedField.required } }));
                                                }}
                                                className="w-full h-11 px-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none text-[14px] font-semibold transition-all"
                                                placeholder="Nouveau nom..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white/60 p-3 rounded-xl border border-[#E4E4E7]/60">
                                                <div className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">Type</div>
                                                <div className="text-[12px] font-bold text-[#18181B] truncate">{selectedField.typeDisplay}</div>
                                            </div>
                                            <div className="bg-white/60 p-3 rounded-xl border border-[#E4E4E7]/60">
                                                <div className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">Clé technique</div>
                                                <div className="text-[12px] font-mono font-bold text-[#18181B] truncate">{selectedField.key}</div>
                                            </div>
                                            <div 
                                                onClick={() => {
                                                    const curReq = pendingFieldChanges[selectedField.key]?.required ?? selectedField.required;
                                                    setPendingFieldChanges(prev => ({ ...prev, [selectedField.key]: { name: prev[selectedField.key]?.name ?? selectedField.name, required: !curReq } }));
                                                }}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer select-none group/req ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'bg-[#4BB961]/10 border-[#4BB961]/30' : 'bg-white/60 border-[#E4E4E7]/60 hover:border-[#4BB961]/30'}`}
                                            >
                                                <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 transition-colors ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'text-[#4BB961]' : 'text-[#A1A1AA]'}`}>Obligatoire</div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className={`w-2 h-2 rounded-full transition-all ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'bg-[#4BB961] shadow-[0_0_8px_rgba(75,185,97,0.5)]' : 'bg-[#A1A1AA]'}`}></div>
                                                    <div className={`text-[12px] font-bold transition-colors ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'text-[#18181B]' : 'text-[#71717A]'}`}>{(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'Oui' : 'Non'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] px-1">Structure de l&apos;objet</div>
                        <div className="max-h-[380px] overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
                            {structModalData?.fieldDefinitions.map((f: any) => {
                                const isEdited = !!pendingFieldChanges[f.key];
                                const currentName = pendingFieldChanges[f.key]?.name ?? f.name;
                                const currentType = f.typeDisplay;
                                return (
                                    <div 
                                        key={f.key} 
                                        onClick={() => { setSelectedField(f); }}
                                        className={`group flex items-center justify-between p-4 rounded-[18px] border transition-all cursor-pointer ${selectedField?.key === f.key ? 'border-[#4BB961] bg-[#4BB961]/5 ring-4 ring-[#4BB961]/5 shadow-sm' : isEdited ? 'bg-[#71717A]/5 border-[#71717A]/40' : 'bg-white border-[#E4E4E7] hover:border-[#4BB961]/30 hover:bg-[#FAFAFA]'}`}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedField(f); } }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-colors ${selectedField?.key === f.key ? 'bg-[#4BB961] text-white' : isEdited ? 'bg-[#71717A] text-white' : 'bg-[#F4F4F5] text-[#71717A] group-hover:bg-[#4BB961]/10 group-hover:text-[#4BB961]'}`}>
                                                <Icons.Layout size={20} />
                                            </div>
                                            <div>
                                                <div className={`text-[15px] font-bold transition-colors ${selectedField?.key === f.key ? 'text-[#4BB961]' : isEdited ? 'text-[#71717A]' : 'text-[#18181B]'}`}>
                                                    {currentName}
                                                    {isEdited && <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-[#71717A] text-white rounded-md uppercase tracking-tighter">Modifié</span>}
                                                </div>
                                                <div className="text-[11px] text-[#A1A1AA] font-medium">{currentType} • <span className="font-mono">{f.key}</span></div>
                                            </div>
                                        </div>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${selectedField?.key === f.key ? 'bg-[#4BB961] text-white scale-110 shadow-[0_0_10px_rgba(75,185,97,0.3)]' : isEdited ? 'bg-[#71717A] text-white' : 'bg-[#F4F4F5] text-[#71717A] opacity-0 group-hover:opacity-100'}`}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </BasilicModal>

            {/* MODALE : GESTION DES ENTRÉES */}
            <BasilicModal 
                isOpen={!!entriesModalData} 
                size="lg"
                onClose={() => setEntriesModalData(null)} 
                title={
                    <div className="flex flex-col gap-1">
                        <div className="text-[20px] font-semibold text-[#18181B]">
                            {entriesModalData?.name}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] text-[#71717A] font-normal">Gérer les entrées</span>
                            <span className="px-2 py-0.5 bg-[#F4F4F5] rounded-full text-[12px] text-[#71717A] font-medium">
                                {entriesCache[entriesModalData?.type]?.length || 0}
                            </span>
                        </div>
                    </div>
                }
                footer={
                    <div className="flex flex-col gap-3 w-full">
                        {selectedEntryIds.size > 0 && (
                            <Button 
                                className="w-full h-11 bg-[#F43F5E] text-white font-bold rounded-[12px] shadow-sm hover:bg-[#E11D48] transition-all animate-in slide-in-from-bottom-2"
                                onPress={() => setEntryDeleteConfirmOpen(true)}
                                startContent={<Icons.Delete size={18} />}
                            >
                                Supprimer {selectedEntryIds.size} donnée{selectedEntryIds.size > 1 ? 's' : ''}
                            </Button>
                        )}
                        <div className="flex gap-3 w-full">
                            <Button variant="light" onPress={() => setEntriesModalData(null)} className="grow bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-11">Fermer</Button>
                            <BasilicButton 
                                className="grow h-11" 
                                isLoading={isGeneratingEntry}
                                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>}
                                onPress={async () => {
                                    setIsGeneratingEntry(true);
                                    const fd = new FormData();
                                    fd.append("action", "create_entry");
                                    fd.append("type", entriesModalData.type);
                                    fd.append("fields", JSON.stringify(entriesModalData.fieldDefinitions));
                                    fetcher.submit(fd, { method: "post" });
                                }}
                            >
                                Générer une entrée test
                            </BasilicButton>
                        </div>
                    </div>
                }
            >
                <div className="py-2 space-y-4">
                    {isEntriesLoading ? (
                        <div className="text-center py-16 space-y-3">
                            <div className="mx-auto w-8 h-8 border-4 border-[#4BB961]/20 border-t-[#4BB961] rounded-full animate-spin"></div>
                            <div className="text-sm font-medium text-[#71717A]">Chargement de vos données...</div>
                        </div>
                    ) : !entriesCache[entriesModalData?.type]?.length ? (
                        <div className="text-center py-16 bg-[#FAFAFA] rounded-[24px] border-2 border-dashed border-[#E4E4E7] space-y-2">
                            <div className="text-[#A1A1AA] flex justify-center"><Icons.Database size={32} opacity={0.4} /></div>
                            <div className="italic text-[#71717A]">Aucune entrée trouvée pour {entriesModalData?.name}.</div>
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {entriesCache[entriesModalData.type].map((e: any) => {
                                const isSelected = selectedEntryIds.has(e.id);
                                return (
                                    <div 
                                        key={e.id} 
                                        onClick={() => {
                                            const newSelected = new Set(selectedEntryIds);
                                            if (newSelected.has(e.id)) newSelected.delete(e.id);
                                            else newSelected.add(e.id);
                                            setSelectedEntryIds(newSelected);
                                        }}
                                        className={`group flex items-center justify-between p-4 rounded-[18px] border transition-all cursor-pointer ${isSelected ? 'border-[#4BB961] bg-[#4BB961]/5 ring-4 ring-[#4BB961]/5 shadow-sm' : 'border-[#E4E4E7] bg-white hover:border-[#4BB961]/30 hover:bg-[#FAFAFA]'}`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-colors ${isSelected ? 'bg-[#4BB961] text-white' : 'bg-[#F4F4F5] text-[#71717A] group-hover:bg-[#4BB961]/10 group-hover:text-[#4BB961]'}`}>
                                                    <Icons.Database size={20} />
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#4BB961] text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in-50 duration-200">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5"><path d="M20 6L9 17l-5-5"/></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-[15px] font-bold transition-all ${isSelected ? 'text-[#4BB961]' : 'text-[#18181B]'} truncate`}>{e.displayName}</div>
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-md whitespace-nowrap ${e.refCount > 0 ? 'bg-[#4BB961]/10 text-[#4BB961]' : 'bg-[#E4E4E7]/50 text-[#71717A]'}`}>
                                                        {e.refCount} référence{e.refCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-[#A1A1AA] font-mono font-medium truncate mt-0.5">
                                                    {e.handle}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Tooltip content="Ouvrir dans Shopify" closeDelay={0}>
                                                <a 
                                                    href={getEntryUrl(entriesModalData.type, e.id)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E4E4E7] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-all shadow-sm"
                                                >
                                                    <Icons.Link size={16} />
                                                </a>
                                            </Tooltip>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </BasilicModal>

            {/* MODALE : CONFIRMATION DE SUPPRESSION DES ENTRÉES */}
            <BasilicModal isOpen={entryDeleteConfirmOpen} onClose={() => setEntryDeleteConfirmOpen(false)} title="Confirmation de suppression" footer={<><Button variant="light" onPress={() => setEntryDeleteConfirmOpen(false)} className="grow bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-11">Annuler</Button><Button isLoading={isDeletingEntries} onPress={() => { setIsDeletingEntries(true); fetcher.submit({ action: 'delete_entries', ids: JSON.stringify(Array.from(selectedEntryIds)) }, { method: 'post' }); }} className="grow bg-[#F43F5E] hover:bg-[#E11D48] text-white font-medium h-11 rounded-[12px]">Confirmer la suppression</Button></>}>
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                        <Icons.Delete />
                        <p className="font-semibold text-sm">Action irréversible</p>
                    </div>
                    <p className="font-medium text-sm text-[#18181B]">Supprimer {selectedEntryIds.size} donnée{selectedEntryIds.size > 1 ? 's' : ''} ?</p>
                    <p className="text-[#71717A] text-xs leading-relaxed">Cette action supprimera définitivement les entrées sélectionnées. Vous ne pourrez pas annuler cette opération.</p>
                </div>
            </BasilicModal>

            {/* MODALE : CONFIRMATION DE SUPPRESSION */}
            <BasilicModal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirmation de suppression" footer={<><Button variant="light" onPress={() => setDeleteConfirmOpen(false)} className="grow bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-11">Annuler</Button><Button onPress={() => { submit({ action: 'delete_item', ids: JSON.stringify(pendingDeleteIds) }, { method: 'post' }); setSelectedKeys(new Set([])); setDeleteConfirmOpen(false); }} className="grow bg-[#F43F5E] hover:bg-[#E11D48] text-white font-medium h-11 rounded-[12px]">Confirmer la suppression</Button></>}>
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                        <Icons.Delete />
                        <p className="font-semibold text-sm">Action irréversible</p>
                    </div>
                    <p className="font-medium text-sm text-[#18181B]">Supprimer {pendingDeleteIds.length} objet{pendingDeleteIds.length > 1 ? 's' : ''} ?</p>
                    <p className="text-[#71717A] text-xs leading-relaxed">Cette action supprimera définitivement la définition de l&apos;objet méta. Les entrées existantes pourraient ne plus être accessibles.</p>
                </div>
            </BasilicModal>

            {/* MODALE : GÉNÉRATION AUTOMATIQUE */}
            <BasilicModal isOpen={autoGenModalOpen} onClose={() => !isGenerating && setAutoGenModalOpen(false)} title={generationComplete ? "Succès" : "Génération automatique"} footer={generationComplete ? null : (autoGenCount > 0 ? (<><Button variant="light" onPress={() => setAutoGenModalOpen(false)} className="bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-10 px-4">Annuler</Button><BasilicButton onPress={confirmAutoGenerate} isLoading={isGenerating}>Confirmer</BasilicButton></>) : (<Button variant="light" onPress={() => setAutoGenModalOpen(false)} className="bg-[#F4F4F5] text-[#71717A] rounded-[12px] h-10 px-4">Fermer</Button>))}>
                {generationComplete ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <p className="font-medium text-center text-[#18181B]">{autoGenCount} descriptions générées avec succès.</p>
                    </div>
                ) : (
                    autoGenCount === 0 ? (
                        <p className="text-sm py-2 text-[#71717A]">Tout est en ordre ! Tous vos objets ont déjà une description.</p>
                    ) : (
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-[#18181B]">Générer automatiquement une description pour <span className="font-bold text-[#4BB961]">{autoGenCount} objets</span> ?</p>
                            <div className="bg-[#F4F4F5] p-3 rounded-lg border border-[#E4E4E7] text-[#71717A] text-xs">
                                Note : Les descriptions seront basées sur le nom technique de l&apos;objet pour aider à l&apos;organisation.
                            </div>
                        </div>
                    )
                )}
            </BasilicModal>

            {/* TOAST NOTIFICATION */}
            {toast && (<div className="mf-toast"><div className="mf-toast--info-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"/></svg></div><div className="mf-toast__content"><span className="mf-toast__title">{toast.title}</span><span className="mf-toast__message">{toast.message}</span></div><div className="mf-toast__close" onClick={() => setToast(null)} role="button" aria-label="Fermer" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setToast(null); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></div></div>)}
        </div>
        </>
    );
}
