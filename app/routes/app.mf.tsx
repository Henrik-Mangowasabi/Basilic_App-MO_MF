import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useSubmit, useFetcher, useRevalidator, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getMetaobjectCount, getMediaCount, getMenuCount, getShopDomain, getActiveThemeId, getSectionsCount, getTemplatesCount } from "../utils/graphql-helpers.server";
import { getReviewStatusMap } from "../utils/reviewStatus.server";
import { createRouteAction } from "../utils/createRouteAction";
import "../styles/metafields-table.css";
import "../styles/basilic-ui.css";
import { Icons } from "../components/Icons";
import { AppBrand, DevModeToggle, BasilicButton, BasilicSearch, NavigationTabs, BasilicModal, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "../components/BasilicUI";
import { useScan } from "../components/ScanProvider";
import { SelectionActionBar } from "../components/SelectionActionBar";

const TRAD: Record<string, string> = { 'single_line_text_field': 'Texte', 'multi_line_text_field': 'Texte (multi)', 'number_integer': 'Entier', 'number_decimal': 'Décimal', 'boolean': 'Booléen', 'url': 'Url', 'json': 'JSON', 'date': 'Date', 'date_time': 'Date Heure', 'color': 'Couleur', 'weight': 'Poids', 'volume': 'Volume', 'dimension': 'Dimension', 'rating': 'Note', 'money': 'Argent', 'file_reference': 'Fichier', 'product_reference': 'Produit', 'variant_reference': 'Variante', 'collection_reference': 'Collection', 'page_reference': 'Page', 'customer_reference': 'Client', 'metaobject_reference': 'Métaobjet' };
const translateType = (t: string) => (!t ? '-' : t.startsWith('list.') ? `Liste ${TRAD[t.replace('list.', '')] || t.replace('list.', '')}` : TRAD[t] || t);
const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const loader = async ({ request }: any) => {
    const { admin, session } = await authenticate.admin(request);
    
    // OPTIMISATION: Récupérer domain, apps installées, et thème en parallèle
    const [domain, appsResult, activeThemeId] = await Promise.all([
        getShopDomain(admin),
        admin.graphql(`query { appInstallations(first: 100) { nodes { app { title handle } } } }`)
            .then(r => r.json())
            .then(j => (j.data?.appInstallations?.nodes || []).map((n: any) => n.app.handle.toLowerCase()))
            .catch(() => []),
        getActiveThemeId(admin)
    ]);

    const installedApps = [...appsResult, 'shopify', 'custom', 'test_data'];

    // OPTIMISATION: Récupérer metafields + counts en parallèle
    const query = `query getMetafieldDefinitions($cursor: String, $ownerType: MetafieldOwnerType!) { metafieldDefinitions(ownerType: $ownerType, first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id name key namespace type { name } description metafieldsCount } } }`;
    const ots = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    
    // Paralléliser: metafields + moCount + mediaCount + templates + menuCount + sections
    const [metafieldResults, moCount, mediaCount, totalTemplates, menuCount, sectionsCount] = await Promise.all([
        // Metafields par type (déjà parallélisé)
        Promise.all(ots.map(async (ot) => {
            let allNodes: any[] = [];
            let hasNextPage = true;
            let cursor: string | null = null;
            
            while (hasNextPage) {
                const r: Response = await admin.graphql(query, { variables: { cursor, ownerType: ot } });
                const j: { data?: { metafieldDefinitions?: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: unknown[] } } } = await r.json();
                const data: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: unknown[] } | undefined = j.data?.metafieldDefinitions;
                if (data?.nodes?.length) {
                    allNodes = [...allNodes, ...data.nodes];
                }
                hasNextPage = data?.pageInfo?.hasNextPage || false;
                cursor = data?.pageInfo?.endCursor || null;
                if (allNodes.length >= 10000) break;
            }
            
            return allNodes.map((n: any) => {
                const ns = n.namespace.toLowerCase();
                const isInstalled = installedApps.some((h: string) => ns.includes(h) || h.includes(ns));
                const fullKey = `${n.namespace}.${n.key}`;
                return { 
                    ...n, 
                    ownerType: ot, 
                    fullKey, 
                    count: n.metafieldsCount, 
                    typeDisplay: translateType(n.type?.name), 
                    diagTitle: (ns === 'custom' || ns === 'test_data') ? 'Manuel' : (ns.includes('discovery') ? 'Search & Discovery' : n.namespace.split(/[-_]+/).map((s: any) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')),
                    diagSubtitle: (ns === 'custom' || ns === 'test_data') ? 'Création manuelle' : (isInstalled ? 'Installée' : 'Désinstallée'),
                    isManual: (ns === 'custom' || ns === 'test_data'),
                    isInstalled: isInstalled,
                    inCode: false
                };
            }); 
        })),
        // MO Count (avec cache)
        getMetaobjectCount(admin, domain),
        // Media Count (avec cache)
        getMediaCount(admin, domain),
        // Templates count (avec cache)
        getTemplatesCount(admin, domain, session.accessToken!),
        // Menu Count (avec cache)
        getMenuCount(admin, domain),
        // Sections count (avec cache)
        getSectionsCount(admin, domain, session.accessToken!)
    ]);

    // Statuts review — requête DB optimisée avec index
    const reviewStatusMap = await getReviewStatusMap(db, domain, "mf");
    
    return {
        domain, moCount, totalTemplates, mediaCount, menuCount, sectionsCount,
        mfData: { p: metafieldResults[0], v: metafieldResults[1], c: metafieldResults[2], cl: metafieldResults[3], o: metafieldResults[4], do_: metafieldResults[5], co: metafieldResults[6], loc: metafieldResults[7], m: metafieldResults[8], pg: metafieldResults[9], b: metafieldResults[10], art: metafieldResults[11], s: metafieldResults[12] },
        reviewStatusMap
    };
};

export const action = createRouteAction({
    source: "mf",
    handlers: {
        update: async (formData, admin, shop) => {
            const ownerType = formData.get("ownerType") as string;
            const namespace = formData.get("namespace") as string;
            const key = formData.get("key") as string;
            const name = formData.get("name") as string;
            const description = formData.get("description") as string;
            const res = await admin.graphql(
                `mutation UpdateMFD($ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!, $name: String!, $description: String) { metafieldDefinitionUpdate(definition: { ownerType: $ownerType, namespace: $namespace, key: $key, name: $name, description: $description }) { userErrors { message } } }`,
                { variables: { ownerType, namespace, key, name, description: description || null } }
            );
            const json = await res.json();
            const userErrors = json?.data?.metafieldDefinitionUpdate?.userErrors || [];
            if (userErrors.length) return { ok: false, errors: userErrors };
            return { ok: true };
        },
        delete: async (formData, admin, shop) => {
            try {
                const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];
                const errors: { message: string }[] = [];
                for (const definitionId of ids) {
                    // 1. Récupérer tous les metafields de cette définition (nécessaire pour les types "reference")
                    const toDelete: { ownerId: string; namespace: string; key: string }[] = [];
                    let cursor: string | null = null;
                    do {
                        const listRes: Response = await admin.graphql(
                            `query GetMFForDefinition($id: ID!, $after: String) {
                                node(id: $id) {
                                    ... on MetafieldDefinition {
                                        namespace
                                        key
                                        metafields(first: 50, after: $after) {
                                            pageInfo { hasNextPage endCursor }
                                            nodes {
                                                namespace
                                                key
                                                owner {
                                                    ... on Product { id }
                                                    ... on ProductVariant { id }
                                                    ... on Collection { id }
                                                    ... on Customer { id }
                                                    ... on Order { id }
                                                    ... on DraftOrder { id }
                                                    ... on Company { id }
                                                    ... on Location { id }
                                                    ... on Market { id }
                                                    ... on Page { id }
                                                    ... on Blog { id }
                                                    ... on Article { id }
                                                    ... on Shop { id }
                                                }
                                            }
                                        }
                                    }
                                }
                            }`,
                            { variables: { id: definitionId, after: cursor } }
                        );
                        const listJson: { data?: { node?: { namespace?: string; key?: string; metafields?: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: { owner?: { id?: string } }[] } } } } = await listRes.json();
                        const node: { namespace?: string; key?: string; metafields?: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: { owner?: { id?: string } }[] } } | undefined = listJson?.data?.node;
                        if (!node?.metafields?.nodes) break;
                        const ns = String(node.namespace ?? "");
                        const k = String(node.key ?? "");
                        for (const mf of node.metafields.nodes) {
                            const o = mf?.owner;
                            const ownerId = o && typeof o === "object" && "id" in o && o.id ? String(o.id) : null;
                            if (ownerId && ns && k) toDelete.push({ ownerId, namespace: ns, key: k });
                        }
                        cursor = node.metafields.pageInfo?.hasNextPage ? node.metafields.pageInfo.endCursor : null;
                    } while (cursor);

                    // 2. Supprimer les metafields associés par lots (25 par requête)
                    const batchSize = 25;
                    for (let i = 0; i < toDelete.length; i += batchSize) {
                        const batch = toDelete.slice(i, i + batchSize);
                        const delRes = await admin.graphql(
                            `mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) { metafieldsDelete(metafields: $metafields) { deletedMetafields { ownerId } userErrors { message } } }`,
                            { variables: { metafields: batch } }
                        );
                        const delJson = await delRes.json();
                        const delErrors = delJson?.data?.metafieldsDelete?.userErrors || [];
                        delErrors.forEach((e: { message: string }) => errors.push(e));
                    }
                    // Petit délai pour la cohérence avant de supprimer la définition
                    if (toDelete.length > 0) await new Promise((r) => setTimeout(r, 800));

                    // 3. Supprimer la définition
                    const res = await admin.graphql(
                        `mutation DeleteMFD($id: ID!) { metafieldDefinitionDelete(id: $id) { userErrors { message } } }`,
                        { variables: { id: definitionId } }
                    );
                    const json = await res.json();
                    const ue = json?.data?.metafieldDefinitionDelete?.userErrors || [];
                    ue.forEach((e: { message: string }) => errors.push(e));
                }
                if (errors.length) return { ok: false, action: "delete", errors };
                return { ok: true, action: "delete" };
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                return { ok: false, action: "delete", errors: [{ message }] };
            }
        },
        generate_descriptions: async (formData, admin, shop) => {
            const missing = JSON.parse((formData.get("items") as string) || "[]") as { id: string; name: string; namespace: string; key: string; ownerType: string }[];
            const errors: { message: string }[] = [];
            for (const item of missing) {
                const desc = (item.name || "").trim() || (item.id.split("/").pop() || "Metafield");
                const res = await admin.graphql(
                    `mutation UpdateMFD($ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!, $name: String!, $description: String) { metafieldDefinitionUpdate(definition: { ownerType: $ownerType, namespace: $namespace, key: $key, name: $name, description: $description }) { userErrors { message } } }`,
                    { variables: { ownerType: item.ownerType, namespace: item.namespace, key: item.key, name: item.name, description: desc } }
                );
                const json = await res.json();
                const ue = json?.data?.metafieldDefinitionUpdate?.userErrors || [];
                ue.forEach((e: { message: string }) => errors.push(e));
            }
            return { ok: true, generated: missing.length, errors: errors.length ? errors : undefined };
        },
        get_assignments: async (formData, admin, shop) => {
            const definitionId = formData.get("definitionId") as string;
            if (!definitionId) return { ok: false, assignments: [] };
            const owners: { type: string; id: string; title: string; handle?: string; status?: string }[] = [];
            let cursor: string | null = null;
            const ownerFragments = `
                ... on Product { __typename id title handle status }
                ... on ProductVariant { __typename id title }
                ... on Collection { __typename id title handle }
                ... on Customer { __typename id displayName }
                ... on Order { __typename id name displayFulfillmentStatus }
                ... on DraftOrder { __typename id name status }
                ... on Company { __typename id name }
                ... on Location { __typename id name }
                ... on Market { __typename id name }
                ... on Page { __typename id title handle }
                ... on Blog { __typename id title handle }
                ... on Article { __typename id title }
                ... on Shop { __typename id name }
            `;
            try {
                do {
                    const res: Response = await admin.graphql(
                        `query GetMFAssignments($id: ID!, $after: String) {
                            node(id: $id) {
                                ... on MetafieldDefinition {
                                    id
                                    metafields(first: 100, after: $after) {
                                        pageInfo { hasNextPage endCursor }
                                        nodes {
                                            owner {
                                                __typename
                                                ${ownerFragments}
                                            }
                                        }
                                    }
                                }
                            }
                        }`,
                        { variables: { id: definitionId, after: cursor } }
                    );
                    type MfNodeType = { metafields?: { pageInfo?: { hasNextPage: boolean; endCursor: string }; nodes?: { owner?: { __typename?: string; id?: string; title?: string; name?: string; displayName?: string; handle?: string; status?: string; displayFulfillmentStatus?: string; state?: string } }[] } };
                    type MfJson = { data?: { node?: MfNodeType }; errors?: { message: string }[] };
                    const json: MfJson = await res.json();

                    if (json.errors) {
                        const msg = json.errors.map((e: { message: string }) => e.message).join(", ");
                        if (msg.includes("Protected Customer Data") || msg.includes("approved to access")) {
                            return { ok: false, assignments: [], error: "Accès refusé : Cette application n'a pas l'autorisation d'accéder aux données protégées des clients (Metafields). Veuillez configurer les accès dans votre Partner Dashboard." };
                        }
                        return { ok: false, assignments: [], error: msg };
                    }

                    const node: MfNodeType | undefined = json?.data?.node;
                    if (!node?.metafields?.nodes) break;
                    for (const mf of node.metafields.nodes) {
                        const o = mf?.owner;
                        if (!o || !o.id) continue;
                        const title = o.title ?? o.name ?? o.displayName ?? o.id.split("/").pop() ?? "";
                        owners.push({
                            type: o.__typename || "Node",
                            id: o.id,
                            title: String(title),
                            handle: o.handle,
                            status: o.status || o.displayFulfillmentStatus || o.state || undefined
                        });
                    }
                    cursor = node.metafields.pageInfo?.hasNextPage ? (node.metafields.pageInfo.endCursor ?? null) : null;
                } while (cursor);
                return { ok: true, assignments: owners };
            } catch (e: any) {
                const msg = e.message || String(e);
                if (msg.includes("Protected Customer Data") || msg.includes("approved to access")) {
                    return { ok: false, assignments: [], error: "Accès refusé : Cette application n'a pas l'autorisation d'accéder aux données protégées des clients (Metafields). Veuillez configurer les accès dans votre Partner Dashboard." };
                }
                return { ok: false, assignments: [], error: "Erreur lors de la récupération des assignations : " + msg };
            }
        }
    }
});

export default function AppMf() {
    const { domain, mfData, moCount, totalTemplates, mediaCount, menuCount, sectionsCount, reviewStatusMap } = useLoaderData<any>();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[]; generated?: number; assignments?: { type: string; id: string; title: string; handle?: string; status?: string }[] } | null>();
    const submit = useSubmit();
    const fetcher = useFetcher<{ ok: boolean; assignments?: { type: string; id: string; title: string; handle?: string; status?: string }[] }>();
    const revalidator = useRevalidator();
    
    // Utiliser le contexte de scan global
    const { isScanning, mfResults, startScan } = useScan();
    
    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Produits": true });
    const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
    const [modalData, setModalData] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{title: string, msg: string} | null>(null);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });
    const [assignmentsModalItem, setAssignmentsModalItem] = useState<any>(null);
    const [autoGenModalOpen, setAutoGenModalOpen] = useState(false);
    const [autoGenCount, setAutoGenCount] = useState(0);

    useEffect(() => { setDevMode(localStorage.getItem('mm_dev_mode') === 'true'); }, []);

    useEffect(() => {
        if (!actionData) return;
        if (actionData.action === "delete" && actionData.ok === true) {
            setDeleteModalOpen(false);
            setSelectedKeys(new Set([]));
            setToast({ title: "Supprimé", msg: "Champ(s) supprimé(s)." });
            revalidator.revalidate();
            return;
        }
        if (actionData.action === "delete" && actionData.ok === false && actionData.errors?.length) {
            setDeleteModalOpen(false);
            setToast({ title: "Erreur", msg: actionData.errors.map((e: { message: string }) => e.message).join(" ") });
            return;
        }
        if ((actionData.action === "set_review_status" || actionData.action === "clear_review_status") && actionData.ok === true) {
            setSelectedKeys(new Set([]));
            setToast({ title: "Statut mis à jour", msg: "Les lignes ont été marquées." });
            revalidator.revalidate();
        }
        if (actionData.ok === false && actionData.errors?.length && actionData.action !== "delete") {
            setToast({ title: "Erreur", msg: actionData.errors.map((e: { message: string }) => e.message).join(" ") });
        } else if (actionData.ok === true && "generated" in actionData && actionData.generated) {
            setToast({ title: "Descriptions générées", msg: `${actionData.generated} description(s) créée(s).` });
            setAutoGenModalOpen(false);
            revalidator.revalidate();
        }
    }, [actionData, revalidator]);

    const toggleDev = (v: boolean) => { setDevMode(v); localStorage.setItem('mm_dev_mode', v ? 'true' : 'false'); };
    const totalCount = Object.values(mfData).reduce((a: number, b: any) => a + b.length, 0);

    const storeSlug = domain.replace(".myshopify.com", "");
    const sectionsList = [
        { t: "Produits", path: "product", i: <Icons.Products/>, d: mfData.p }, { t: "Variantes", path: "variant", i: <Icons.Variants/>, d: mfData.v }, { t: "Collections", path: "collection", i: <Icons.Collections/>, d: mfData.c }, { t: "Clients", path: "customer", i: <Icons.Clients/>, d: mfData.cl }, { t: "Commandes", path: "order", i: <Icons.Orders/>, d: mfData.o }, { t: "Commandes Provisoires", path: "draft_order", i: <Icons.Orders/>, d: mfData.do_ }, { t: "Entreprises B2B", path: "company", i: <Icons.Companies/>, d: mfData.co }, { t: "Emplacements (Stock)", path: "location", i: <Icons.Locations/>, d: mfData.loc }, { t: "Marchés", path: "market", i: <Icons.Markets/>, d: mfData.m }, { t: "Pages", path: "page", i: <Icons.Generic/>, d: mfData.pg }, { t: "Blogs", path: "blog", i: <Icons.Generic/>, d: mfData.b }, { t: "Articles", path: "article", i: <Icons.Generic/>, d: mfData.art }, { t: "Boutique", path: "shop", i: <Icons.Generic/>, d: mfData.s }
    ];
    const sectionsWithData = sectionsList.filter((s: { d: any[] }) => s.d.length > 0);
    const sectionNewLabel: Record<string, string> = { "Produits": "produit", "Variantes": "variant", "Collections": "collection", "Clients": "client", "Commandes": "commande", "Commandes Provisoires": "commande provisoire", "Entreprises B2B": "entreprise", "Emplacements (Stock)": "emplacement", "Marchés": "marché", "Pages": "page", "Blogs": "blog", "Articles": "article", "Boutique": "boutique" };
    const getShopifyLink = (item: any) => {
        const otMap: Record<string, string> = { 'PRODUCT': 'product', 'PRODUCTVARIANT': 'productvariant', 'COLLECTION': 'collection', 'CUSTOMER': 'customer', 'ORDER': 'order', 'DRAFTORDER': 'draftorder', 'COMPANY': 'company', 'LOCATION': 'location', 'MARKET': 'market', 'PAGE': 'page', 'BLOG': 'blog', 'ARTICLE': 'article', 'SHOP': 'shop' };
        return `https://admin.shopify.com/store/${storeSlug}/settings/custom_data/${otMap[item.ownerType]}/metafields/${item.id.split('/').pop()}`;
    };
    const getAdminUrlForOwner = (type: string, id: string) => {
        const pathMap: Record<string, string> = { Product: "products", ProductVariant: "products", Collection: "collections", Customer: "customers", Order: "orders", DraftOrder: "draft_orders", Company: "customers", Location: "locations", Market: "markets", Page: "pages", Blog: "blogs", Article: "blogs", Shop: "settings" };
        const path = pathMap[type] || "settings";
        const gid = id.split("/").pop();
        return `https://admin.shopify.com/store/${storeSlug}/${path}/${gid}`;
    };
    const handleOpenAssignments = (item: any) => {
        setAssignmentsModalItem(item);
        const fd = new FormData();
        fd.append("action", "get_assignments");
        fd.append("definitionId", item.id);
        fetcher.submit(fd, { method: "post" });
    };

    const handleSort = (columnKey: string) => {
        setSortConfig(prev => {
            if (prev.column === columnKey) {
                // Si on clique sur la même colonne, inverser la direction
                return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                // Nouvelle colonne, trier par ordre croissant
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

    const pathToShopifyUrl: Record<string, string> = { variant: "productvariant", draft_order: "draftorder" };
    const getColumns = (section: { t: string; path: string; i: React.ReactNode; d: any[] }) => {
        const shopifyPath = pathToShopifyUrl[section.path] ?? section.path;
        const newMfUrlSection = storeSlug ? `https://admin.shopify.com/store/${storeSlug}/settings/custom_data/${shopifyPath}` : "#";
        return [
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
                    <span>NOM DU METAFIELD</span>
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
            { key: "fullKey", label: (<div className="relative overflow-visible"><div className="mf-dev-badge"><span>&lt;/&gt;</span> Dev Mode <a href={newMfUrlSection} target="_blank" rel="noopener noreferrer" className="mf-dev-badge__new" onClick={(e: React.MouseEvent) => e.stopPropagation()} title="Nouveau">+ Nouveau</a></div>CLÉ TECH</div>), className: "mf-col--key mf-table__header--dev" },
            { key: "type", label: "STRUCTURE", className: "mf-col--type mf-table__header--dev" },
            { key: "status", label: "DIAG", className: "mf-col--status mf-table__header--dev" },
            { key: "code", label: "CODE", className: "mf-col--code mf-table__header--dev" }
        ] : []),
        { key: "count", label: "ASSING.", className: "mf-col--count" },
        { key: "actions", label: "LIEN", className: "mf-col--actions" },
        { key: "menu", label: " ", className: "mf-col--menu" }
    ];
    };

    const renderCell = (item: any, key: React.Key) => {
        switch (key) {
            case "name": return (<div className="mf-cell mf-cell--multi"><span className="mf-text--title">{item.name}</span><span className="mf-text--desc">{item.description || "Aucune description"}</span></div>);
            case "fullKey": return (
                <div className="mf-cell mf-cell--key">
                    <span
                        className="mf-text--key"
                        onClick={() => {
                            navigator.clipboard.writeText(item.fullKey);
                            setToast({ title: "Copié", msg: item.fullKey });
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Cliquer pour copier"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigator.clipboard.writeText(item.fullKey);
                                setToast({ title: "Copié", msg: item.fullKey });
                            }
                        }}
                    >{item.fullKey}</span>
                </div>
            );
            case "type": return (<div className="mf-cell mf-cell--type"><span className="mf-chip">{item.typeDisplay}</span></div>);
            case "status": return (
                <div className="mf-cell mf-cell--status mf-cell--multi">
                    <span className="mf-text--title !font-semibold">{item.diagTitle}</span>
                    {item.isManual ? (
                        <span className="mf-text--desc text-11">{item.diagSubtitle}</span>
                    ) : (
                        <span className={`mf-text--status text-11 font-medium flex items-center gap-1.5 ${!item.isInstalled ? 'text-danger' : ''}`}>
                            <span className={item.isInstalled ? "text-success" : "text-danger"}>●</span> {item.diagSubtitle}
                        </span>
                    )}
                </div>
            );
            case "code": {
                // Utiliser le cache si disponible, sinon utiliser item.inCode
                const inCode = mfResults.size > 0 ? mfResults.has(item.fullKey) : (item.inCode || false);
                return (<div className="mf-cell mf-cell--center mf-cell--badge"><span className={`mf-badge--code ${inCode ? 'mf-badge--found' : ''}`}>{inCode ? 'Oui' : 'Non'}</span></div>);
            }
            case "count": return (<div className="mf-cell mf-cell--center"><button type="button" onClick={() => handleOpenAssignments(item)} className="mf-badge--count hover:bg-gray-200 transition-colors cursor-pointer">{item.count}</button></div>);
            case "actions": return (<div className="mf-cell mf-cell--center"><Tooltip content="Ouvrir"><a href={getShopifyLink(item)} target="_blank" rel="noopener noreferrer" className="mf-action-link"><Icons.Link /></a></Tooltip></div>);
            case "menu": return (<div className="mf-cell mf-cell--center"><Dropdown classNames={{ content: "mf-dropdown-content" }}><DropdownTrigger><Button isIconOnly variant="light" size="sm" className="w-8 h-8"><Icons.VerticalDots /></Button></DropdownTrigger><DropdownMenu aria-label="Actions" onAction={(k) => { if (k === 'edit') { setEditName(item.name); setEditDesc(item.description || ""); setModalData(item); } else if (k === 'delete') { setPendingDeleteIds([item.id]); setDeleteModalOpen(true); } }}><DropdownItem key="edit" startContent={<Icons.Edit />} className="mf-dropdown-item"><span className="mf-dropdown-item__title">Editer</span></DropdownItem><DropdownItem key="delete" startContent={<Icons.Delete />} className="mf-dropdown-item mf-dropdown-item--delete"><span className="mf-dropdown-item__title">supprimer</span></DropdownItem></DropdownMenu></Dropdown></div>);
            default: return null;
        }
    };

    const handleOnSelectionChange = (sectionData: any[], keys: any) => {
        if (keys === "all") {
            const newSet = new Set(selectedKeys);
            sectionData.forEach(d => newSet.add(d.id));
            setSelectedKeys(newSet);
        } else {
            const currentTableIds = new Set(sectionData.map(d => d.id));
            const otherIds = new Set([...selectedKeys].filter(id => !currentTableIds.has(id)));
            const final = new Set([...otherIds, ...keys]);
            setSelectedKeys(final);
        }
    };

    const allItems = useMemo(() => Object.values(mfData).flat() as any[], [mfData]);
    const handleGenerateDescriptions = () => {
        const missing = allItems.filter((d: any) => !d.description || d.description === "Aucune description" || String(d.description).trim() === "");
        setAutoGenCount(missing.length);
        setAutoGenModalOpen(true);
    };
    const confirmGenerateDescriptions = () => {
        const missing = allItems.filter((d: any) => !d.description || d.description === "Aucune description" || String(d.description).trim() === "");
        const fd = new FormData();
        fd.append("action", "generate_descriptions");
        fd.append("items", JSON.stringify(missing.map((d: any) => ({ id: d.id, name: d.name, namespace: d.namespace, key: d.key, ownerType: d.ownerType }))));
        submit(fd, { method: "post" });
    };
    const filteredSearch = useMemo(() => {
        if (!search?.trim()) return [];
        const s = norm(search.trim());
        return allItems.filter((d: any) => 
            norm(d.name).includes(s) || 
            norm(d.fullKey).includes(s) || 
            (d.description && norm(d.description).includes(s)) ||
            (d.diagTitle && norm(d.diagTitle).includes(s)) ||
            (d.typeDisplay && norm(d.typeDisplay).includes(s))
        );
    }, [search, allItems]);

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
                </BasilicButton><BasilicButton onPress={handleGenerateDescriptions} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}>Générer descriptions manquantes</BasilicButton></div></div>
                <div className="page-nav-row"><NavigationTabs activePath="/app/mf" counts={{ mf: totalCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount, sections: sectionsCount }} /><div style={{ width: '320px' }}><BasilicSearch value={search} onValueChange={setSearch} placeholder="Search" /></div></div>
                
                {search ? (
                    filteredSearch.length > 0 ? (
                        <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mf-section__header mf-section__header--open"><div className="mf-section__title-group"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><span className="mf-section__title">Résultats de recherche</span><span className="mf-section__count">{filteredSearch.length}</span></div></div>
                            <div className="mf-table__base animate-in fade-in zoom-in-95 duration-300"><Table aria-label="Table MF Search" removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys as any} className="mf-table" classNames={{ th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`, td: "mf-table__cell", tr: "mf-table__row" }}><TableHeader>{getColumns(sectionsWithData[0] ?? { t: "Produits", path: "product", i: <></>, d: [] }).map((c: any) => (<TableColumn key={c.key} align={c.key === "count" || c.key === "actions" || c.key === "menu" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>))}</TableHeader><TableBody items={sortData(filteredSearch)} emptyContent="Aucun résultat.">{(item: any) => (<TableRow key={item.id} rowKey={item.id} className={reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.id] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{getColumns(sectionsWithData[0] ?? { t: "Produits", path: "product", i: <></>, d: [] }).map((c: any) => <TableCell key={c.key} className={['fullKey', 'type', 'status', 'code'].includes(c.key) ? 'mf-cell--devmode' : ''}>{renderCell(item, c.key)}</TableCell>)}</TableRow>)}</TableBody></Table></div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state__icon">
                                <Icons.Search />
                            </div>
                            <div className="empty-state__title">Aucun résultat de recherche pour &quot;<span className="text-danger">{search}</span>&quot;</div>
                            <div className="empty-state__subtitle">Nous n&apos;avons rien trouvé correspondant à votre recherche.</div>
                        </div>
                    )
                ) : (
                    <div className="space-y-4">
                        {sectionsWithData.map((s: { t: string; path: string; i: React.ReactNode; d: any[] }) => {
                            const sortedData = sortData(s.d);
                            return (
                            <div key={s.t} className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div 
                                    className={`mf-section__header ${openSections[s.t] ? 'mf-section__header--open' : 'mf-section__header--closed'}`} 
                                    onClick={() => setOpenSections(p => ({ ...p, [s.t]: !p[s.t] }))}
                                    style={!openSections[s.t] ? { borderRadius: '8px' } : undefined}
                                ><div className="mf-section__title-group"><span className="mf-section__icon">{s.i}</span><span className="mf-section__title">{s.t}</span><span className="mf-section__count">{s.d.length}</span></div><span className={`mf-section__chevron ${openSections[s.t] ? 'mf-section__chevron--open' : ''}`}><Icons.ChevronRight /></span></div>
                                {openSections[s.t] && (
                                    <div className="mf-table__base animate-in fade-in zoom-in-95 duration-300"><Table aria-label={`Table ${s.t}`} removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={(selectedKeys as any) === "all" ? "all" : new Set([...selectedKeys].filter(k => sortedData.some((x: any) => x.id === k)))} onSelectionChange={(k) => handleOnSelectionChange(sortedData, k)} className="mf-table" classNames={{ th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`, td: "mf-table__cell", tr: "mf-table__row" }}><TableHeader>{getColumns(s).map((c: any) => (<TableColumn key={c.key} align={c.key === "count" || c.key === "actions" || c.key === "menu" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>))}</TableHeader><TableBody items={sortedData} emptyContent="Aucun champ.">{(item: any) => (<TableRow key={item.id} rowKey={item.id} className={reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.id] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{getColumns(s).map((c: any) => <TableCell key={c.key} className={['fullKey', 'type', 'status', 'code'].includes(c.key) ? 'mf-cell--devmode' : ''}>{renderCell(item, c.key)}</TableCell>)}</TableRow>)}</TableBody></Table></div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
                </div>

                <SelectionActionBar
                    selectedCount={selectedKeys.size}
                    onClearSelection={() => setSelectedKeys(new Set([]))}
                    onMarkToReview={() => { const fd = new FormData(); fd.append("action", "set_review_status"); fd.append("ids", JSON.stringify(Array.from(selectedKeys).map(k => String(k)))); fd.append("status", "to_review"); submit(fd, { method: "post" }); }}
                    onMarkReviewed={() => { const fd = new FormData(); fd.append("action", "set_review_status"); fd.append("ids", JSON.stringify(Array.from(selectedKeys).map(k => String(k)))); fd.append("status", "reviewed"); submit(fd, { method: "post" }); }}
                    onClearReviewStatus={() => { const fd = new FormData(); fd.append("action", "clear_review_status"); fd.append("ids", JSON.stringify(Array.from(selectedKeys).map(k => String(k)))); submit(fd, { method: "post" }); }}
                    onDelete={() => { setPendingDeleteIds(Array.from(selectedKeys).map(k => String(k))); setDeleteModalOpen(true); }}
                    showDelete={true}
                />

                <BasilicModal isOpen={!!modalData} onClose={() => setModalData(null)} title="Editer le champ" footer={<><Button variant="light" onPress={() => setModalData(null)} className="btn-modal-cancel">Annuler</Button><BasilicButton className="grow" onPress={() => { const fd = new FormData(); fd.append("action", "update"); fd.append("id", modalData.id); fd.append("ownerType", modalData.ownerType); fd.append("namespace", modalData.namespace); fd.append("key", modalData.key); fd.append("name", editName); fd.append("description", editDesc); submit(fd, { method: "post" }); setModalData(null); setToast({ title: "Enregistré", msg: "Modification enregistrée." }); }}>Enregistrer</BasilicButton></>}><div className="space-y-4 pt-2"><div><label htmlFor="mf-name" className="form-label">Titre</label><input id="mf-name" value={editName} onChange={e => setEditName(e.target.value)} className="form-input" /></div><div><label htmlFor="mf-desc" className="form-label">Description</label><textarea id="mf-desc" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="form-textarea" /></div></div></BasilicModal>
                <BasilicModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmer suppression" footer={<><Button variant="light" onPress={() => setDeleteModalOpen(false)} className="btn-modal-cancel">Annuler</Button><Button onPress={() => { const fd = new FormData(); fd.append("action", "delete"); fd.append("ids", JSON.stringify(pendingDeleteIds)); submit(fd, { method: "post" }); }} className="btn-modal-danger">Confirmer</Button></>}>
                    <p className="py-2 text-sm">Supprimer ces {pendingDeleteIds.length} champs ? Cette action est irréversible.</p>
                </BasilicModal>

                <BasilicModal isOpen={autoGenModalOpen} onClose={() => setAutoGenModalOpen(false)} title="Générer descriptions manquantes" footer={<><Button variant="light" onPress={() => setAutoGenModalOpen(false)} className="btn-modal-cancel">Annuler</Button><BasilicButton className="grow" onPress={confirmGenerateDescriptions}>Générer {autoGenCount} description(s)</BasilicButton></>}><p className="py-2 text-sm text-gray-500">{autoGenCount === 0 ? "Aucun metafield sans description." : `${autoGenCount} metafield(s) n'ont pas de description. La description sera dérivée du nom.`}</p></BasilicModal>

                <BasilicModal isOpen={!!assignmentsModalItem} onClose={() => setAssignmentsModalItem(null)} title={assignmentsModalItem?.name ?? "Assignations"} footer={undefined}>
                    <div className="mf-assignments-modal__wrap">
                    <div className="mf-assignments-modal__header">
                        <div className="mf-assignments-modal__subtitle-row">
                            <span className="mf-assignments-modal__subtitle">Gérer les entrées</span>
                            <span className="mf-assignments-modal__count-pill">
                                {fetcher.state === "loading" || fetcher.state === "submitting" ? "—" : (fetcher.data?.assignments?.length ?? 0)}
                            </span>
                        </div>
                    </div>
                    {fetcher.state === "loading" || fetcher.state === "submitting" ? (
                        <div className="mf-assignments-modal__loading">Chargement...</div>
                    ) : (fetcher.data as any)?.error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                            {(fetcher.data as any).error}
                        </div>
                    ) : fetcher.data?.assignments?.length ? (
                        <div className="mf-assignments-modal__list">
                            {fetcher.data.assignments.map((a: { type: string; id: string; title: string; handle?: string; status?: string }) => {
                                const isDraft = a.status === "DRAFT" || a.status === "PENDING";
                                const isArchived = a.status === "ARCHIVED" || a.status === "DISABLED";
                                const isActive = a.status === "ACTIVE" || a.status === "ENABLED" || a.status === "FULFILLED" || (!a.status && a.type !== "Product");
                                
                                const getIcon = (type: string) => {
                                    switch (type) {
                                        case 'Product': return <Icons.Products />;
                                        case 'ProductVariant': return <Icons.Variants />;
                                        case 'Collection': return <Icons.Collections />;
                                        case 'Customer': return <Icons.Clients />;
                                        case 'Order':
                                        case 'DraftOrder': return <Icons.Orders />;
                                        default: return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
                                    }
                                };

                                return (
                                    <div key={a.id} className="mf-assignments-modal__card">
                                        <div className={`mf-assignments-modal__card-icon ${isActive ? 'text-success' : (isDraft ? 'text-warning' : 'text-danger')}`} aria-hidden>
                                            {getIcon(a.type)}
                                        </div>
                                        <div className="mf-assignments-modal__card-body">
                                            <div className="mf-assignments-modal__card-name">{a.title || a.id}</div>
                                            {a.status && (
                                                <div className={`text-10 font-bold uppercase mt-1 leading-none ${isActive ? 'text-success' : (isDraft ? 'text-warning' : 'text-danger')}`}>
                                                    {a.status}
                                                </div>
                                            )}
                                        </div>
                                        <a href={getAdminUrlForOwner(a.type, a.id)} target="_blank" rel="noopener noreferrer" className="mf-assignments-modal__card-link" title="Ouvrir dans l'admin" onClick={e => e.stopPropagation()}>
                                            <Icons.Link />
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mf-assignments-modal__empty">Aucune ressource assignée.</p>
                    )}
                    </div>
                </BasilicModal>

                {toast && (<div className="mf-toast"><div className="mf-toast__content"><span className="mf-toast__title">{toast.title}</span><span className="mf-toast__message">{toast.msg}</span></div></div>)}
            </div>
        </>
    );
}