import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useFetcher, useActionData, useLocation, useNavigation, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getMetafieldCount, getMediaCount, getMenuCount, getActiveThemeId, getSectionsCount, getTemplatesCount } from "../utils/graphql-helpers.server";
import { getReviewStatusMap } from "../utils/reviewStatus.server";
import { createRouteAction } from "../utils/createRouteAction";
import "../styles/metafields-table.css";
import "../styles/basilic-ui.css";
import { Icons } from "../components/Icons";
import { useScan } from "../components/ScanProvider";
import { AppBrand, DevModeToggle, BasilicButton, BasilicSearch, NavigationTabs, BasilicModal, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "../components/BasilicUI";
import { useReviewStatus } from "../hooks/useReviewStatus";
import { useTableSelection } from "../hooks/useTableSelection";
import { SelectionActionBar } from "../components/SelectionActionBar";

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
    
    // OPTIMISATION: Lancer counts, templates, menuCount et sections en parallèle
    const [allMoNodes, mfCount, mediaCount, totalTemplates, menuCount, sectionsCount] = await Promise.all([
        moDefsPromise,
        getMetafieldCount(admin, shopDomain),
        getMediaCount(admin, shopDomain),
        getTemplatesCount(admin, shopDomain, session.accessToken!),
        getMenuCount(admin, shopDomain),
        getSectionsCount(admin, shopDomain, session.accessToken!)
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
    const reviewStatusMap = await getReviewStatusMap(db, shopDomain, "mo");

    return {
        shopDomain,
        moData,
        mfCount,
        moCount: moData.length,
        totalTemplates,
        sectionsCount,
        mediaCount,
        menuCount,
        reviewStatusMap,
    };
};

export const action = createRouteAction({
    source: "mo",
    handlers: {
        get_entries: async (formData, admin) => {
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
        },

        update_desc: async (formData, admin) => {
            await admin.graphql(
                `mutation UpdateMOD($id: ID!, $name: String!, $description: String) {
                    metaobjectDefinitionUpdate(id: $id, definition: { name: $name, description: $description }) {
                        userErrors { message field }
                    }
                }`,
                {
                    variables: {
                        id: formData.get("id"),
                        name: formData.get("name"),
                        description: formData.get("description")
                    }
                }
            );
            return { ok: true };
        },

        update_fields: async (formData, admin) => {
            const fields = JSON.parse(formData.get("fields") as string);
            await admin.graphql(
                `mutation UpdateFields($id: ID!, $fields: [MetaobjectFieldDefinitionOperationInput!]!) {
                    metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fields }) {
                        userErrors { message field }
                    }
                }`,
                { variables: { id: formData.get("id"), fields } }
            );
            return { ok: true };
        },

        delete_item: async (formData, admin) => {
            const ids = JSON.parse(formData.get("ids") as string || "[]");
            for (const id of ids) {
                await admin.graphql(
                    `mutation DeleteMOD($id: ID!) {
                        metaobjectDefinitionDelete(id: $id) {
                            userErrors { message }
                        }
                    }`,
                    { variables: { id } }
                );
            }
            return { ok: true };
        },

        delete_entry: async (formData, admin) => {
            await admin.graphql(
                `mutation DeleteMO($id: ID!) {
                    metaobjectDelete(id: $id) {
                        userErrors { message }
                    }
                }`,
                { variables: { id: formData.get("id") } }
            );
            return { ok: true };
        },

        delete_entries: async (formData, admin) => {
            const ids = JSON.parse(formData.get("ids") as string || "[]");
            for (const id of ids) {
                await admin.graphql(
                    `mutation DeleteMO($id: ID!) {
                        metaobjectDelete(id: $id) {
                            userErrors { message }
                        }
                    }`,
                    { variables: { id } }
                );
            }
            return { ok: true };
        },

        create_entry: async (formData, admin) => {
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

            const res = await admin.graphql(
                `mutation CreateMO($mo: MetaobjectCreateInput!) {
                    metaobjectCreate(metaobject: $mo) {
                        metaobject {
                            id
                            handle
                            displayName
                            referencedBy(first: 1) {
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
                        userErrors {
                            message
                        }
                    }
                }`,
                { variables: { mo: { type, fields } } }
            );
            const json = await res.json();
            const mo = json.data?.metaobjectCreate?.metaobject;
            if (!mo) return { ok: false, error: json.data?.metaobjectCreate?.userErrors?.[0]?.message };
            let entry: any = { id: mo.id, handle: mo.handle, displayName: mo.displayName, refCount: mo.referencedBy?.edges?.length || 0 };
            mo.fields?.forEach((f: any) => { entry[f.key] = f.value || '-'; });
            return { ok: true, entry };
        }
    }
});

export default function AppMo() {
    const { shopDomain, moData, mfCount, moCount, totalTemplates, sectionsCount, mediaCount, menuCount, reviewStatusMap } = useLoaderData<any>();
    const location = useLocation();
    const navigation = useNavigation();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[] } | null>();
    const fetcher = useFetcher();
    const submit = useSubmit();

    // ✨ Hooks custom pour simplifier la logique
    const { setReviewStatus, clearReviewStatus, revalidator } = useReviewStatus();
    const { selectedKeys, setSelectedKeys, handleSelectionChange, clearSelection } = useTableSelection();
    const { isScanning, moResults, startScan } = useScan();

    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [modalData, setModalData] = useState<any>(null);
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
            clearSelection();
            setToast({ title: "Statut mis à jour", message: "Les lignes ont été marquées." });
            setTimeout(() => setToast(null), 3000);
            revalidator.revalidate();
        }
    }, [actionData, revalidator, clearSelection]);
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

    const handleOpenEntries = (item: any) => { setEntriesModalData(item); setSelectedEntryIds(new Set()); if (!entriesCache[item.type]) { setIsEntriesLoading(true); const fd = new FormData(); fd.append("action", "get_entries"); fd.append("type", item.type); fd.append("fields", JSON.stringify(item.fieldDefinitions)); fetcher.submit(fd, { method: "post" }); } };

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
                            className={`text-gray-500 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
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
                            className="text-gray-400 opacity-50"
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
            case "fields": return (<div className="mf-cell mf-cell--type"><div className="mf-chip cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => { setStructModalData(item); setSelectedField(null); setPendingFieldChanges({}); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStructModalData(item); setSelectedField(null); setPendingFieldChanges({}); } }}>{item.fieldsCount} Champs</div></div>);
            case "code_usage": {
                const inCode = moResults.size > 0 ? moResults.has(item.type) : (item.code_usage === 'Oui');
                return (<div className="mf-cell mf-cell--center mf-cell--badge"><span className={`mf-badge--code ${inCode ? 'mf-badge--found' : ''}`}>{inCode ? 'Oui' : 'Non'}</span></div>);
            }
            case "count": return (<div className="mf-cell mf-cell--center"><button onClick={() => handleOpenEntries(item)} className="mf-badge--count hover:bg-gray-200 transition-colors cursor-pointer">{item.count}</button></div>);
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
            <div className="page">
            <div className="page-content page-content--wide space-y-6">
                <div className="page-header"><AppBrand /><div className="page-header__actions"><DevModeToggle isChecked={devMode} onChange={toggleDev} /><BasilicButton
                    variant="flat"
                    className="btn-secondary"
                    isLoading={isScanning}
                    onPress={() => {
                        setSelectedKeys(new Set());
                        startScan();
                    }}
                    icon={isScanning ? null : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>}
                >
                    Scan Code
                </BasilicButton><BasilicButton onPress={checkAutoGenerate} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}>Générer descriptions manquantes</BasilicButton></div></div>
                <div className="page-nav-row"><NavigationTabs activePath="/app/mo" counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount, sections: sectionsCount }} /><div style={{ width: '320px' }}><BasilicSearch value={search} onValueChange={setSearch} placeholder="Search" /></div></div>
                {search && filteredData.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <div className="empty-state__title">Aucun résultat de recherche pour &quot;<span className="text-danger">{search}</span>&quot;</div>
                        <div className="empty-state__subtitle">Nous n&apos;avons rien trouvé correspondant à votre recherche.</div>
                    </div>
                ) : (
                    <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className={`mf-section__header ${isTableOpen ? 'mf-section__header--open' : ''}`} onClick={() => setIsTableOpen(!isTableOpen)}><div className="mf-section__title-group"><Icons.Products className="mf-section__icon" /><span className="mf-section__title">{search ? 'Résultats de recherche' : 'Tous les Objets Méta'}</span><span className="mf-section__count">{filteredData.length}</span></div><div className="mf-section__arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${isTableOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg></div></div>
                        {isTableOpen && (<div className="mf-table__base animate-in fade-in zoom-in-95 duration-300"><Table aria-label="Table des objets" removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={selectedKeys} onSelectionChange={(keys) => handleSelectionChange(filteredData, keys as Set<string> | "all")} className="mf-table" classNames={{ wrapper: "mf-table__wrapper", th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`, td: "mf-table__cell", tr: "mf-table__row" }}><TableHeader>{columns.map((column: any) => (<TableColumn key={column.key} align={column.key === "count" || column.key === "actions" || column.key === "menu" ? "center" : "start"} className={column.className}>{column.label}</TableColumn>))}</TableHeader><TableBody items={sortData(filteredData)} emptyContent={<div className="mf-empty">Aucun objet trouvé.</div>}>{(item: any) => (<TableRow key={item.id} rowKey={item.id} className={reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.id] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{columns.map((col: any) => <TableCell key={col.key} className={['fullKey', 'fields', 'code_usage'].includes(col.key) ? 'mf-cell--devmode' : ''}>{renderCell(item, col.key)}</TableCell>)}</TableRow>)}</TableBody></Table></div>)}
                    </div>
                )}
            </div>

            <SelectionActionBar
                selectedCount={selectedKeys.size}
                onClearSelection={clearSelection}
                onMarkToReview={() => setReviewStatus(Array.from(selectedKeys).map(k => String(k)), "to_review")}
                onMarkReviewed={() => setReviewStatus(Array.from(selectedKeys).map(k => String(k)), "reviewed")}
                onClearReviewStatus={() => clearReviewStatus(Array.from(selectedKeys).map(k => String(k)))}
                onDelete={() => { setPendingDeleteIds(Array.from(selectedKeys).map(k => String(k))); setDeleteConfirmOpen(true); }}
                showDelete={true}
            />

            {/* MODALE : ÉDITION DE L'OBJET (Titre / Description) */}
            <BasilicModal 
                isOpen={!!modalData} 
                onClose={() => setModalData(null)} 
                title="Modification de l'objet" 
                footer={
                    <>
                        <Button variant="light" onPress={() => setModalData(null)} className="btn-modal-cancel">Annuler</Button>
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
                <div className="modal-content">
                    <div className="form-group">
                        <label htmlFor="edit-mo-name" className="form-label">Titre de l&apos;objet</label>
                        <input
                            id="edit-mo-name"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-mo-desc" className="form-label">Description</label>
                        <textarea
                            id="edit-mo-desc"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="form-textarea form-textarea--tall"
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
                    <div className="modal-header">
                        <div className="modal-title">
                            {structModalData?.name}
                            <span className="modal-badge">{structModalData?.fieldDefinitions.length}</span>
                        </div>
                    </div>
                }
                footer={
                    <>
                        <Button variant="light" onPress={() => setStructModalData(null)} className="btn-modal-cancel">Annuler</Button>
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
                            <Button variant="light" onPress={() => setStructModalData(null)} className="btn-modal-cancel">Fermer</Button>
                        )}
                    </>
                }
            >
                <div className="mo-modal-content">
                    {selectedField && (
                        <div className="mo-field-editor">
                            <button onClick={() => setSelectedField(null)} className="mo-field-editor__close" aria-label="Fermer l'édition">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                            <div className="mo-field-editor__title">Édition du champ</div>

                            <div className="mo-field-editor__form-group">
                                <label htmlFor="field-edit-name" className="mo-field-editor__label">Nom affiché</label>
                                <input
                                    id="field-edit-name"
                                    value={pendingFieldChanges[selectedField.key]?.name ?? selectedField.name}
                                    onChange={e => {
                                        const newName = e.target.value;
                                        setPendingFieldChanges(prev => ({ ...prev, [selectedField.key]: { name: newName, required: prev[selectedField.key]?.required ?? selectedField.required } }));
                                    }}
                                    className="mo-field-editor__input"
                                    placeholder="Nouveau nom..."
                                />
                            </div>

                            <div className="mo-field-editor__info-grid">
                                <div className="mo-field-editor__info-card">
                                    <div className="mo-field-editor__info-label">Type</div>
                                    <div className="mo-field-editor__info-value">{selectedField.typeDisplay}</div>
                                </div>
                                <div className="mo-field-editor__info-card">
                                    <div className="mo-field-editor__info-label">Clé technique</div>
                                    <div className="mo-field-editor__info-value mo-field-editor__info-value--mono">{selectedField.key}</div>
                                </div>
                                <div
                                    onClick={() => {
                                        const curReq = pendingFieldChanges[selectedField.key]?.required ?? selectedField.required;
                                        setPendingFieldChanges(prev => ({ ...prev, [selectedField.key]: { name: prev[selectedField.key]?.name ?? selectedField.name, required: !curReq } }));
                                    }}
                                    className={`mo-field-editor__toggle-card ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'mo-field-editor__toggle-card--active' : ''}`}
                                >
                                    <div className="mo-field-editor__info-label">Obligatoire</div>
                                    <div className="mo-field-editor__toggle-indicator">
                                        <div className={`mo-field-editor__toggle-dot ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'mo-field-editor__toggle-dot--active' : ''}`}></div>
                                        <div className={`mo-field-editor__toggle-text ${(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'mo-field-editor__toggle-text--active' : ''}`}>{(pendingFieldChanges[selectedField.key]?.required ?? selectedField.required) ? 'Oui' : 'Non'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mo-structure-section">
                        <div className="mo-structure-section__title">Structure de l&apos;objet</div>
                        <div className="mo-structure-section__list custom-scrollbar">
                            {structModalData?.fieldDefinitions.map((f: any) => {
                                const isEdited = !!pendingFieldChanges[f.key];
                                const currentName = pendingFieldChanges[f.key]?.name ?? f.name;
                                const currentType = f.typeDisplay;
                                const isSelected = selectedField?.key === f.key;
                                return (
                                    <div
                                        key={f.key}
                                        onClick={() => { setSelectedField(f); }}
                                        className={`mo-field-item ${isSelected ? 'mo-field-item--selected' : ''} ${isEdited ? 'mo-field-item--edited' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedField(f); } }}
                                    >
                                        <div className="mo-field-item__content">
                                            <div className="mo-field-item__icon">
                                                <Icons.Layout size={20} />
                                            </div>
                                            <div className="mo-field-item__info">
                                                <div className="mo-field-item__name">
                                                    {currentName}
                                                    {isEdited && <span className="mo-field-item__badge">Modifié</span>}
                                                </div>
                                                <div className="mo-field-item__meta">{currentType} • <span className="mo-field-item__meta-key">{f.key}</span></div>
                                            </div>
                                        </div>
                                        <div className="mo-field-item__arrow">
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
                    <div className="modal-header">
                        <div className="modal-title">
                            {entriesModalData?.name}
                            <span className="modal-badge">{entriesCache[entriesModalData?.type]?.length || 0}</span>
                        </div>
                    </div>
                }
                footer={
                    <div className="mo-entries-footer">
                        {selectedEntryIds.size > 0 && (
                            <Button
                                className="btn-modal-danger"
                                onPress={() => setEntryDeleteConfirmOpen(true)}
                                startContent={<Icons.Delete size={18} />}
                            >
                                Supprimer {selectedEntryIds.size} donnée{selectedEntryIds.size > 1 ? 's' : ''}
                            </Button>
                        )}
                        <div className="mo-entries-footer__row">
                            <Button variant="light" onPress={() => setEntriesModalData(null)} className="btn-modal-cancel">Fermer</Button>
                            <BasilicButton
                                className="btn-modal-confirm"
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
                <div>
                    {isEntriesLoading ? (
                        <div className="mo-entries-loading">
                            <div className="mo-entries-loading__spinner"></div>
                            <div className="mo-entries-loading__text">Chargement de vos données...</div>
                        </div>
                    ) : !entriesCache[entriesModalData?.type]?.length ? (
                        <div className="mo-entries-empty">
                            <div className="mo-entries-empty__icon"><Icons.Database size={32} opacity={0.4} /></div>
                            <div className="mo-entries-empty__text">Aucune entrée trouvée pour {entriesModalData?.name}.</div>
                        </div>
                    ) : (
                        <div className="mo-entries-list custom-scrollbar">
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
                                        className={`mo-entry-item ${isSelected ? 'mo-entry-item--selected' : ''}`}
                                    >
                                        <div className="mo-entry-item__content">
                                            <div className="mo-entry-item__icon-wrapper">
                                                <div className="mo-entry-item__icon">
                                                    <Icons.Database size={20} />
                                                </div>
                                                {isSelected && (
                                                    <div className="mo-entry-item__check">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5"><path d="M20 6L9 17l-5-5"/></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mo-entry-item__info">
                                                <div className="mo-entry-item__name-row">
                                                    <div className="mo-entry-item__name">{e.displayName}</div>
                                                    <span className={`mo-entry-item__ref-badge ${e.refCount > 0 ? 'mo-entry-item__ref-badge--active' : ''}`}>
                                                        {e.refCount} référence{e.refCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <div className="mo-entry-item__handle">{e.handle}</div>
                                            </div>
                                        </div>

                                        <div className="mo-entry-item__actions">
                                            <Tooltip content="Ouvrir dans Shopify" closeDelay={0}>
                                                <a
                                                    href={getEntryUrl(entriesModalData.type, e.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mo-entry-item__link"
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
            <BasilicModal isOpen={entryDeleteConfirmOpen} onClose={() => setEntryDeleteConfirmOpen(false)} title="Confirmation de suppression" footer={<><Button variant="light" onPress={() => setEntryDeleteConfirmOpen(false)} className="btn-modal-cancel">Annuler</Button><Button isLoading={isDeletingEntries} onPress={() => { setIsDeletingEntries(true); fetcher.submit({ action: 'delete_entries', ids: JSON.stringify(Array.from(selectedEntryIds)) }, { method: 'post' }); }} className="grow bg-danger hover:bg-danger-dark text-white font-medium h-11 rounded-md">Confirmer la suppression</Button></>}>
                <div className="">
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                        <Icons.Delete />
                        <p className="font-semibold text-sm">Action irréversible</p>
                    </div>
                    <p className="font-medium text-sm text-gray-900">Supprimer {selectedEntryIds.size} donnée{selectedEntryIds.size > 1 ? 's' : ''} ?</p>
                    <p className="text-gray-500 text-xs leading-relaxed">Cette action supprimera définitivement les entrées sélectionnées. Vous ne pourrez pas annuler cette opération.</p>
                </div>
            </BasilicModal>

            {/* MODALE : CONFIRMATION DE SUPPRESSION */}
            <BasilicModal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirmation de suppression" footer={<><Button variant="light" onPress={() => setDeleteConfirmOpen(false)} className="btn-modal-cancel">Annuler</Button><Button onPress={() => { submit({ action: 'delete_item', ids: JSON.stringify(pendingDeleteIds) }, { method: 'post' }); setSelectedKeys(new Set([])); setDeleteConfirmOpen(false); }} className="grow bg-danger hover:bg-danger-dark text-white font-medium h-11 rounded-md">Confirmer la suppression</Button></>}>
                <div className="">
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                        <Icons.Delete />
                        <p className="font-semibold text-sm">Action irréversible</p>
                    </div>
                    <p className="font-medium text-sm text-gray-900">Supprimer {pendingDeleteIds.length} objet{pendingDeleteIds.length > 1 ? 's' : ''} ?</p>
                    <p className="text-gray-500 text-xs leading-relaxed">Cette action supprimera définitivement la définition de l&apos;objet méta. Les entrées existantes pourraient ne plus être accessibles.</p>
                </div>
            </BasilicModal>

            {/* MODALE : GÉNÉRATION AUTOMATIQUE */}
            <BasilicModal isOpen={autoGenModalOpen} onClose={() => !isGenerating && setAutoGenModalOpen(false)} title={generationComplete ? "Succès" : "Génération automatique"} footer={generationComplete ? null : (autoGenCount > 0 ? (<><Button variant="light" onPress={() => setAutoGenModalOpen(false)} className="bg-gray-100 text-gray-500 rounded-md h-10 px-4">Annuler</Button><BasilicButton onPress={confirmAutoGenerate} isLoading={isGenerating}>Confirmer</BasilicButton></>) : (<Button variant="light" onPress={() => setAutoGenModalOpen(false)} className="bg-gray-100 text-gray-500 rounded-md h-10 px-4">Fermer</Button>))}>
                {generationComplete ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <p className="font-medium text-center text-gray-900">{autoGenCount} descriptions générées avec succès.</p>
                    </div>
                ) : (
                    autoGenCount === 0 ? (
                        <p className="text-sm py-2 text-gray-500">Tout est en ordre ! Tous vos objets ont déjà une description.</p>
                    ) : (
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-gray-900">Générer automatiquement une description pour <span className="font-bold text-primary">{autoGenCount} objets</span> ?</p>
                            <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-gray-500 text-xs">
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
