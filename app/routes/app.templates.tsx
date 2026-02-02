import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useLocation, useActionData } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import db from "../db.server";
import { getMetaobjectCount, getMetafieldCount, getMediaCount, getMenuCount, getSectionsCount } from "../utils/graphql-helpers.server";
import { getReviewStatusMap } from "../utils/reviewStatus.server";
import { createRouteAction } from "../utils/createRouteAction";
import "../styles/metafields-table.css";
import "../styles/basilic-ui.css";
import { useScan } from "../components/ScanProvider";
import { AppBrand, BasilicSearch, NavigationTabs, BasilicButton, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "../components/BasilicUI";
import { useReviewStatus } from "../hooks/useReviewStatus";
import { useTableSelection } from "../hooks/useTableSelection";
import { SelectionActionBar } from "../components/SelectionActionBar";
import { Icons } from "../components/Icons";

interface ResourceInfo {
    id: string;
    title: string;
    status?: string;
    blogId?: string; // Pour les articles, on a besoin du blogId
}

interface TemplateItem {
    id: string;
    key: string;
    name: string;
    suffix: string | null;
    type: string;
    updated_at: string;
    count: number;
    countActive: number;
    countInactive: number;
    resourcesActive: ResourceInfo[];
    resourcesInactive: ResourceInfo[];
}

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    
    // 1. Theme Check
    const themesRes = await admin.graphql(`{ themes(first: 5, roles: [MAIN]) { nodes { id name } } }`);
    const themesJson = await themesRes.json();
    const activeTheme = themesJson.data?.themes?.nodes?.[0];
    if (!activeTheme) {
        const reviewStatusMapEarly = await getReviewStatusMap(db, session.shop, "templates");
        return { templateData: {}, moCount: 0, mfCount: 0, themeId: null, totalTemplates: 0, mediaCount: 0, shop: session.shop, reviewStatusMap: reviewStatusMapEarly };
    }
    const themeId = activeTheme.id.split('/').pop();

    // 2. Fetch Assets REST
    const assetsRes = await fetch(`https://${session.shop}/admin/api/${apiVersion}/themes/${themeId}/assets.json`, {
        headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
    });
    const assetsJson = await assetsRes.json();
    const assets = assetsJson.assets || [];
    const templateAssets = assets.filter((a: { key: string }) => a.key.startsWith('templates/') && a.key.endsWith('.json'));

    const templateData: Record<string, any[]> = { product: [], collection: [], page: [], blog: [], article: [] };

    for (const asset of templateAssets) {
        const parts = asset.key.replace('templates/', '').replace('.json', '').split('.');
        const type = parts[0];
        const suffix = parts.length > 1 ? parts.slice(1).join('.') : null;
        if (templateData[type]) {
            templateData[type].push({ 
                id: asset.key, 
                key: asset.key, 
                name: suffix ? `${type}.${suffix}` : `${type} (defaut template)`, 
                suffix: suffix, 
                type: type, 
                updated_at: asset.updated_at, 
                count: 0,
            countActive: 0,
            countInactive: 0,
            resourcesActive: [],
            resourcesInactive: []
            });
        }
    }

    // Sort: default first
    Object.keys(templateData).forEach(type => {
        templateData[type].sort((a, b) => {
            if (a.suffix === null) return -1;
            if (b.suffix === null) return 1;
            return a.name.localeCompare(b.name);
        });
    });

    // 3. STATS LOGIC
    async function getResourceSuffixes(queryName: string, queryField: string, extraQuery: string = "", includeIsGiftCard: boolean = false, includeStatus: boolean = false, includeFullInfo: boolean = false, includeBlogId: boolean = false) {
        let hasNextPage = true;
        let cursor = null;
        let list: { suffix: string | null, isGiftCard: boolean, status?: string, id?: string, title?: string, blogId?: string }[] = [];

        while (hasNextPage) {
            const query = `query get${queryName}($cursor: String) {
                ${queryField}(first: 250, after: $cursor ${extraQuery ? `, query: "${extraQuery}"` : ""}) {
                    pageInfo { hasNextPage endCursor }
                    edges { node { 
                        id
                        ${includeFullInfo ? 'title' : ''}
                        templateSuffix 
                        ${includeIsGiftCard ? 'isGiftCard' : ''} 
                        ${includeStatus ? 'status' : ''}
                        ${includeBlogId ? 'blog { id }' : ''}
                    } }
                }
            }`;
            const res: Response = await admin.graphql(query, { variables: { cursor } });
            const json: { data?: Record<string, { edges: { node: { templateSuffix: string | null; isGiftCard?: boolean; status?: string; id?: string; title?: string; blog?: { id: string } } }[]; pageInfo: { hasNextPage: boolean; endCursor: string } }> } = await res.json();
            const data: { edges: { node: { templateSuffix: string | null; isGiftCard?: boolean; status?: string; id?: string; title?: string; blog?: { id: string } } }[]; pageInfo: { hasNextPage: boolean; endCursor: string } } | undefined = json.data?.[queryField];
            if (!data) break;

            list = [...list, ...data.edges.map((e: { node: { templateSuffix: string | null, isGiftCard?: boolean, status?: string, id?: string, title?: string, blog?: { id: string } } }) => ({
                suffix: e.node.templateSuffix || null,
                isGiftCard: !!e.node.isGiftCard,
                status: e.node.status || undefined,
                id: e.node.id || undefined,
                title: e.node.title || undefined,
                blogId: e.node.blog?.id || undefined
            }))];
            hasNextPage = data.pageInfo.hasNextPage;
            cursor = data.pageInfo.endCursor;
        }
        return list;
    }

    // Récupérer TOUS les ressources avec leur status et infos complètes
    const [prodNodes, collNodes, pageNodes, blogNodes, artNodes] = await Promise.all([
        getResourceSuffixes('Products', 'products', '', true, true, true, false), // Produits avec status et infos complètes
        getResourceSuffixes('Collections', 'collections', '', false, false, true, false), // Collections avec infos complètes
        getResourceSuffixes('Pages', 'pages', '', false, false, true, false), // Pages avec infos complètes
        getResourceSuffixes('Blogs', 'blogs', '', false, false, true, false), // Blogs avec infos complètes
        getResourceSuffixes('Articles', 'articles', '', false, false, true, true) // Articles avec infos complètes et blogId
    ]);

    const productStats = prodNodes.filter(n => !n.isGiftCard);
    const globalNodes: Record<string, { suffix: string | null, status?: string, id?: string, title?: string, blogId?: string }[]> = { 
        product: productStats, 
        collection: collNodes, 
        page: pageNodes, 
        blog: blogNodes, 
        article: artNodes 
    };

    Object.entries(templateData).forEach(([type, templates]) => {
        const resourceNodes = globalNodes[type] || [];
        templates.forEach(t => {
            // Comparer les suffixes : null ou chaîne vide = template par défaut
            const templateSuffix = t.suffix || null;
            
            const matchingNodes = resourceNodes.filter((n: { suffix: string | null, status?: string, id?: string, title?: string, blogId?: string }) => {
                const nodeSuffix = n.suffix || null;
                if (templateSuffix === null && nodeSuffix === null) return true;
                return templateSuffix === nodeSuffix;
            });
            
            if (type === 'product') {
                // Produits actifs (status === 'ACTIVE')
                const activeResources = matchingNodes.filter((n: { status?: string }) => n.status === 'ACTIVE');
                t.countActive = activeResources.length;
                t.resourcesActive = activeResources.map((n: { id?: string, title?: string, status?: string }) => ({
                    id: n.id || '',
                    title: n.title || 'Sans titre',
                    status: n.status || ''
                }));
                
                // Produits inactifs (status !== 'ACTIVE' ou null)
                const inactiveResources = matchingNodes.filter((n: { status?: string }) => n.status !== 'ACTIVE');
                t.countInactive = inactiveResources.length;
                t.resourcesInactive = inactiveResources.map((n: { id?: string, title?: string, status?: string }) => ({
                    id: n.id || '',
                    title: n.title || 'Sans titre',
                    status: n.status || ''
                }));
                
                t.count = t.countActive + t.countInactive;
            } else {
                // Pour les autres types, tout est considéré comme "actif" (pas de distinction status)
                t.count = matchingNodes.length;
                t.countActive = t.count;
                t.countInactive = 0;
                
                t.resourcesActive = matchingNodes.map((n: { id?: string, title?: string, blogId?: string }) => ({
                    id: n.id || '',
                    title: n.title || 'Sans titre',
                    blogId: n.blogId || undefined
                }));
                t.resourcesInactive = [];
            }
        });
    });

    // 4. Counts - OPTIMISATION: Utiliser le cache et paralléliser
    const managedTypes = ['product', 'collection', 'page', 'blog', 'article'];
    const totalTemplatesCount = managedTypes.reduce((acc, type) => acc + (templateData[type]?.length || 0), 0);
    
    const shopDomain = session.shop;
    
    // OPTIMISATION: Tous les counts en parallèle avec cache
    const [moCount, mfCount, mediaCount, menuCount, sectionsCount] = await Promise.all([
        getMetaobjectCount(admin, shopDomain),
        getMetafieldCount(admin, shopDomain),
        getMediaCount(admin, shopDomain),
        getMenuCount(admin, shopDomain),
        getSectionsCount(admin, shopDomain, session.accessToken!)
    ]);
    const reviewStatusMap = await getReviewStatusMap(db, shopDomain, "templates");

    return { templateData, moCount, mfCount, totalTemplates: totalTemplatesCount, themeId, mediaCount, menuCount, sectionsCount, shop: session.shop, reviewStatusMap };
};

export const action = createRouteAction({
    source: "templates"
});

export default function AppTemplates() {
    const { templateData, moCount, mfCount, totalTemplates, mediaCount, menuCount, sectionsCount, shop, reviewStatusMap } = useLoaderData<typeof loader>();
    const location = useLocation();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[] } | null>();

    // ✨ Hooks custom pour simplifier la logique
    const { setReviewStatus, clearReviewStatus, revalidator } = useReviewStatus();
    const { selectedKeys, handleSelectionChange, clearSelection } = useTableSelection();
    const { isScanning, templateResults, startScan } = useScan();

    const [search, setSearch] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Produits": true });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ template: TemplateItem; type: 'active' | 'inactive' } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });

    const handleSort = (columnKey: string) => {
        setSortConfig(prev => {
            if (prev.column === columnKey) {
                // Si on clique sur la même colonne, inverser la direction
                return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                // Nouvelle colonne, commencer par 'asc'
                return { column: columnKey, direction: 'asc' };
            }
        });
    };

    const sortData = (data: TemplateItem[]) => {
        if (!sortConfig.column) return data;

        const sorted = [...data].sort((a, b) => {
            let aVal: string = '';
            let bVal: string = '';

            switch (sortConfig.column) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
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

    useEffect(() => {
        if (!actionData?.ok || !actionData?.action) return;
        if (actionData.action === "set_review_status" || actionData.action === "clear_review_status") {
            clearSelection();
            revalidator.revalidate();
        }
    }, [actionData, revalidator, clearSelection]);


    const columns = [
        {
            key: "name",
            label: (
                <div
                    className="mf-col--sortable"
                    onClick={(e) => { e.stopPropagation(); handleSort('name'); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSort('name'); } }}
                    role="button"
                    tabIndex={0}
                >
                    <span>NOM DU TEMPLATE</span>
                    {sortConfig.column === 'name' ? (
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`mf-sort-icon ${sortConfig.direction === 'desc' ? 'mf-sort-icon--desc' : ''}`}
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
                            strokeWidth="2"
                            className="mf-sort-icon mf-sort-icon--neutral"
                        >
                            <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </div>
            ),
            className: "mf-col--name"
        },
        { key: "updated", label: "DATE DE CRÉATION", className: "mf-col--date" },
        { key: "countActive", label: "ASSIGNATIONS ACTIVES", className: "mf-col--count" },
        { key: "countInactive", label: "ASSIGNATIONS INACTIVES", className: "mf-col--count" }
    ];

    /* Empêche tout événement pointer/clic sur les cellules de déclencher la sélection (React Aria utilise usePress) */
    const stopRowSelect = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

    const renderCell = (item: TemplateItem, columnKey: React.Key) => {
        switch (columnKey) {
            case "name": return (
                <div className="mf-cell mf-cell--multi w-full mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                    <span className="mf-text--title">
                        {item.suffix ? `${item.type}.${item.suffix}` : item.type}
                    </span>
                    <span className="mf-text--desc">
                        {!item.suffix ? "(defaut template)" : item.key}
                    </span>
                </div>
            );
            case "updated": return (
                <div className="mf-cell mf-cell--start w-full mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                    <span className="text-14 text-gray-500">{new Date(item.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
            );
            case "countActive": {
                const labels: Record<string, string> = { product: 'produit', collection: 'collection', page: 'page', blog: 'blog', article: 'article' };
                const label = labels[item.type] || item.type;
                const isClickable = item.countActive > 0;
                return (
                    <div className="mf-cell mf-cell--center whitespace-nowrap w-full mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                        <span 
                            className={`mf-badge--count ${item.countActive > 0 ? 'badge-success' : 'badge-neutral'} ${isClickable ? 'cursor-pointer hover-opacity transition-opacity' : ''}`}
                            onClick={isClickable ? (e: React.MouseEvent) => {
                                e.stopPropagation();
                                setModalData({ template: item, type: 'active' });
                                setModalOpen(true);
                            } : undefined}
                            role={isClickable ? "button" : undefined}
                            tabIndex={isClickable ? 0 : undefined}
                            onKeyDown={isClickable ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setModalData({ template: item, type: 'active' });
                                    setModalOpen(true);
                                }
                            } : undefined}
                        >
                            {item.countActive} {label}{item.countActive > 1 ? 's' : ''}
                        </span>
                    </div>
                );
            }
            case "countInactive": {
                const labels: Record<string, string> = { product: 'produit', collection: 'collection', page: 'page', blog: 'blog', article: 'article' };
                const label = labels[item.type] || item.type;
                const isClickable = item.countInactive > 0;
                return (
                    <div className="mf-cell mf-cell--center whitespace-nowrap w-full mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                        <span 
                            className={`mf-badge--count ${item.countInactive > 0 ? 'badge-danger' : 'badge-neutral'} ${isClickable ? 'cursor-pointer hover-opacity transition-opacity' : ''}`}
                            onClick={isClickable ? (e: React.MouseEvent) => {
                                e.stopPropagation();
                                setModalData({ template: item, type: 'inactive' });
                                setModalOpen(true);
                            } : undefined}
                            role={isClickable ? "button" : undefined}
                            tabIndex={isClickable ? 0 : undefined}
                            onKeyDown={isClickable ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setModalData({ template: item, type: 'inactive' });
                                    setModalOpen(true);
                                }
                            } : undefined}
                        >
                            {item.countInactive} {label}{item.countInactive > 1 ? 's' : ''}
                        </span>
                    </div>
                );
            }
            default: return null;
        }
    };

    const allItems = useMemo(() => Object.values(templateData).flat() as TemplateItem[], [templateData]);
    const filteredSearch = useMemo(() => {
        if (!search?.trim()) return [];
        const s = norm(search.trim());
        return allItems.filter((d: TemplateItem) => norm(d.name).includes(s) || norm(d.key).includes(s) || norm(d.type).includes(s));
    }, [search, allItems]);

    const sections = [ 
        { type: 'product', label: 'Produits', icon: <Icons.Products /> }, 
        { type: 'collection', label: 'Collections', icon: <Icons.Collections /> }, 
        { type: 'page', label: 'Pages', icon: <Icons.Pages /> }, 
        { type: 'blog', label: 'Blogs', icon: <Icons.Blogs /> }, 
        { type: 'article', label: 'Articles', icon: <Icons.Articles /> } 
    ];

    return (
        <div className="page">
            <div className="page-content page-content--wide space-y-6">
                <div className="page-header">
                    <AppBrand />
                    <BasilicButton
                        variant="flat"
                        className="btn-secondary"
                        isLoading={isScanning}
                        onPress={() => startScan()}
                        icon={isScanning ? null : <Icons.Refresh />}
                    >
                        Scan Code
                    </BasilicButton>
                </div>

                <div className="page-nav-row">
                    <NavigationTabs activePath={location.pathname} counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount, sections: sectionsCount }} />
                    <div style={{ width: '320px' }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher un template..." />
                    </div>
                </div>

                {search ? (
                    filteredSearch.length > 0 ? (
                        <div className="mf-section animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="mf-section__header mf-section__header--open">
                                <div className="mf-section__title-group">
                                    <Icons.Search />
                                    <span className="mf-section__title">Résultats</span>
                                    <span className="mf-section__count">{filteredSearch.length}</span>
                                </div>
                            </div>
                            <div className="mf-table__base">
                                <Table aria-label="Résultats" removeWrapper selectionMode="multiple" selectionBehavior="checkbox" onRowAction={() => {}} selectedKeys={new Set([...selectedKeys].filter((k) => filteredSearch.some((d: TemplateItem) => d.key === k)))} onSelectionChange={(keys) => handleSelectionChange(filteredSearch, keys as Set<string> | "all")} className="mf-table mf-table--templates" classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}>
                                    <TableHeader>{columns.map((c) => <TableColumn key={c.key} align={c.key === "countActive" || c.key === "countInactive" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>)}</TableHeader>
                                    <TableBody items={sortData(filteredSearch)}>{(item: TemplateItem) => <TableRow key={item.key} rowKey={item.key} className={reviewStatusMap?.[item.key] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.key] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{columns.map((c) => <TableCell key={c.key}>{renderCell(item, c.key)}</TableCell>)}</TableRow>}</TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state__title">Aucun résultat trouvé.</div>
                        </div>
                    )
                ) : allItems.length === 0 ? (
                    <div className="empty-state animate-in fade-in">
                        <div className="empty-state__title">Aucun template trouvé</div>
                        <div className="empty-state__description">Votre thème actif n&apos;a pas encore de fichiers templates (product, collection, page, blog, article). Les templates s&apos;afficheront ici une fois présents dans le thème.</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sections.map(s => {
                            const data = (templateData as Record<string, any[]>)[s.type] || [];
                            if (data.length === 0) return null;
                            const isOpen = openSections[s.label];
                            return (
                                <div key={s.type} className="mf-section animate-in fade-in slide-in-from-bottom duration-500">
                                    <div className={`mf-section__header ${isOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`} onClick={() => setOpenSections(p => ({ ...p, [s.label]: !p[s.label] }))}>
                                        <div className="mf-section__title-group"><span className="mf-section__icon">{s.icon}</span><span className="mf-section__title">{s.label}</span><span className="mf-section__count">{data.length}</span></div>
                                        <span className={`mf-section__chevron ${isOpen ? 'mf-section__chevron--open' : ''}`}><Icons.ChevronRight /></span>
                                    </div>
                                    {isOpen && (
                                        <div className="mf-table__base">
                                            <Table aria-label={s.label} removeWrapper selectionMode="multiple" selectionBehavior="checkbox" onRowAction={() => {}} selectedKeys={new Set([...selectedKeys].filter((k) => data.some((d: TemplateItem) => d.key === k)))} onSelectionChange={(keys) => handleSelectionChange(data, keys as Set<string> | "all")} className="mf-table mf-table--templates" classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}>
                                                <TableHeader>{columns.map((c: any) => (<TableColumn key={c.key} align={c.key === "countActive" || c.key === "countInactive" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>))}</TableHeader>
                                                <TableBody items={sortData(data)} emptyContent="Aucun template trouvé.">{(item: any) => (<TableRow key={item.key} rowKey={item.key} className={reviewStatusMap?.[item.key] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.key] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{columns.map((c: any) => <TableCell key={c.key}>{renderCell(item, c.key)}</TableCell>)}</TableRow>)}</TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <SelectionActionBar
                selectedCount={selectedKeys.size}
                onClearSelection={clearSelection}
                onMarkToReview={() => setReviewStatus(Array.from(selectedKeys), "to_review")}
                onMarkReviewed={() => setReviewStatus(Array.from(selectedKeys), "reviewed")}
                onClearReviewStatus={() => clearReviewStatus(Array.from(selectedKeys))}
            />

            {/* Modal pour afficher les produits assignés */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                size="2xl"
                scrollBehavior="inside"
                classNames={{
                    base: "modal-base",
                    header: "modal-header",
                    body: "modal-body",
                    footer: "modal-footer"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-2">
                                <div className="modal-title">
                                    {modalData?.template.name}
                                </div>
                                <div className="modal-subtitle">
                                    {(() => {
                                        const labels: Record<string, string> = {
                                            product: 'produit',
                                            collection: 'collection',
                                            page: 'page',
                                            blog: 'blog',
                                            article: 'article'
                                        };
                                        const label = labels[modalData?.template.type || ''] || 'ressource';
                                        const plural = modalData?.type === 'active'
                                            ? ((modalData.template.resourcesActive?.length ?? 0) > 1 ? 's' : '')
                                            : ((modalData?.template.resourcesInactive?.length ?? 0) > 1 ? 's' : '');
                                        const statusText = modalData?.type === 'active' ? 'actif' : 'inactif';
                                        return `${label}${plural} ${statusText}${plural} assigné${plural}`;
                                    })()}
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                {modalData && (() => {
                                    const resources = modalData.type === 'active' 
                                        ? modalData.template.resourcesActive 
                                        : modalData.template.resourcesInactive;
                                    
                                    const getResourceUrl = (resource: ResourceInfo, type: string) => {
                                        const resourceId = resource.id.split('/').pop();
                                        const baseUrl = `https://${shop}/admin`;
                                        
                                        switch (type) {
                                            case 'product':
                                                return `${baseUrl}/products/${resourceId}`;
                                            case 'collection':
                                                return `${baseUrl}/collections/${resourceId}`;
                                            case 'page':
                                                return `${baseUrl}/pages/${resourceId}`;
                                            case 'blog':
                                                return `${baseUrl}/blogs/${resourceId}`;
                                            case 'article':
                                                // Les articles nécessitent le blogId dans l'URL
                                                if (resource.blogId) {
                                                    const blogId = resource.blogId.split('/').pop();
                                                    return `${baseUrl}/blogs/${blogId}/articles/${resourceId}`;
                                                }
                                                return `${baseUrl}/blogs/${resourceId}`;
                                            default:
                                                return `${baseUrl}`;
                                        }
                                    };
                                    
                                    const isActive = modalData.type === 'active';
                                    const cardClass = isActive ? 'resource-card--active' : 'resource-card--inactive';
                                    const badgeClass = isActive ? 'resource-card__badge--active' : 'resource-card__badge--inactive';
                                    const arrowColor = isActive ? '#4BB961' : '#F43F5E';

                                    return (
                                        <div className="space-y-4">
                                            {resources.length > 0 ? (
                                                <div className="space-y-2">
                                                    {resources.map((resource) => {
                                                        const resourceId = resource.id.split('/').pop();
                                                        const resourceUrl = getResourceUrl(resource, modalData.template.type);
                                                        const badgeText = isActive
                                                            ? 'ACTIF'
                                                            : (modalData.template.type === 'product' ? (resource.status || 'INACTIF') : 'ASSIGNÉ');

                                                        return (
                                                            <a
                                                                key={resource.id}
                                                                href={resourceUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`resource-card ${cardClass}`}
                                                            >
                                                                <div className="resource-card__content">
                                                                    <div className="resource-card__title">
                                                                        {resource.title}
                                                                    </div>
                                                                    <div className="resource-card__meta">
                                                                        ID: {resourceId}
                                                                        {modalData.template.type === 'product' && resource.status && ` • Status: ${resource.status}`}
                                                                    </div>
                                                                </div>
                                                                <div className="resource-card__actions">
                                                                    <span className={`resource-card__badge ${badgeClass}`}>
                                                                        {badgeText}
                                                                    </span>
                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="resource-card__arrow">
                                                                        <path d="M6 3L11 8L6 13" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                    </svg>
                                                                </div>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="modal-empty">
                                                    {(() => {
                                                        const labels: Record<string, string> = {
                                                            product: 'produit',
                                                            collection: 'collection',
                                                            page: 'page',
                                                            blog: 'blog',
                                                            article: 'article'
                                                        };
                                                        const label = labels[modalData.template.type] || 'ressource';
                                                        const statusText = isActive ? 'actif' : 'inactif';
                                                        return `Aucun ${label} ${statusText} assigné`;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    color="default"
                                    variant="light"
                                    onPress={onClose}
                                    className="text-gray-900"
                                >
                                    Fermer
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
