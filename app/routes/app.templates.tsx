import { useState, useMemo } from "react";
import { useLoaderData, useLocation, useRevalidator } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import "../styles/metafields-table.css";
import { AppBrand, BasilicSearch, NavigationTabs, BasilicButton } from "../components/BasilicUI";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

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

const Icons = {
    Products: (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.85091L12.6642 2.79552C14.0586 1.3957 16.2064 1.28222 17.4613 2.54206C18.7163 3.8019 18.6033 5.95797 17.2088 7.3578L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path opacity="0.5" d="M11.6281 8.33333C12.8831 9.59317 12.77 11.7492 11.3756 13.1491L9.35575 15.1768L7.33591 17.2045C5.94149 18.6043 3.79373 18.7178 2.53875 17.4579C1.28378 16.1981 1.39682 14.042 2.79124 12.6422L4.81111 10.6144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
    Collections: (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M18.3334 15.8333C18.3334 16.2754 18.1578 16.6993 17.8453 17.0118C17.5327 17.3244 17.1088 17.5 16.6667 17.5H3.33341C2.89139 17.5 2.46746 17.3244 2.1549 17.0118C1.84234 16.6993 1.66675 16.2754 1.66675 15.8333V4.16667C1.66675 3.72464 1.84234 3.30072 2.1549 2.98816C2.46746 2.67559 2.89139 2.5 3.33341 2.5H7.50008L9.16675 5H16.6667C17.1088 5 17.5327 5.17559 17.8453 5.48816C18.1578 5.80072 18.3334 6.22464 18.3334 6.66667V15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Pages: (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>),
    Blogs: (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>),
    Articles: (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>),
    ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" {...props}><path d="M4.45508 9.96001L7.71508 6.70001C8.10008 6.31501 8.10008 5.68501 7.71508 5.30001L4.45508 2.04001" stroke="#A1A1AA" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/></svg>),
};

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    
    // 1. Theme Check
    const themesRes = await admin.graphql(`{ themes(first: 5, roles: [MAIN]) { nodes { id name } } }`);
    const themesJson = await themesRes.json();
    const activeTheme = themesJson.data?.themes?.nodes?.[0];
    if (!activeTheme) return { templateData: {}, moCount: 0, mfCount: 0, themeId: null, totalTemplates: 0 };
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
            const res = await admin.graphql(query, { variables: { cursor } });
            const json = await res.json();
            const data = json.data?.[queryField];
            if (!data) break;

            list = [...list, ...data.edges.map((e: { node: { templateSuffix: string | null, isGiftCard?: boolean, status?: string, id?: string, title?: string, blog?: { id: string } } }) => ({ 
                suffix: e.node.templateSuffix || null, 
                isGiftCard: !!e.node.isGiftCard,
                status: e.node.status || null,
                id: e.node.id || null,
                title: e.node.title || null,
                blogId: e.node.blog?.id || null
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

    // 4. Counts
    const managedTypes = ['product', 'collection', 'page', 'blog', 'article'];
    const totalTemplatesCount = managedTypes.reduce((acc, type) => acc + (templateData[type]?.length || 0), 0);
    
    // Metaobjects Count - Count all with pagination
    let moCount = 0;
    let hasNextMoPage = true;
    let moCursor: string | null = null;
    while (hasNextMoPage) {
        const moAllRes = await admin.graphql(`query getMetaobjectDefinitionsCount($cursor: String) { metaobjectDefinitions(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id } } }`, { variables: { cursor: moCursor } });
        const moAllJson: any = await moAllRes.json();
        const data: any = moAllJson.data?.metaobjectDefinitions;
        if (data?.nodes && Array.isArray(data.nodes)) {
            moCount += data.nodes.length;
        }
        hasNextMoPage = data?.pageInfo?.hasNextPage || false;
        moCursor = data?.pageInfo?.endCursor || null;
        if (moCount >= 10000) break; // Safety limit
    }

    // Metafields Count - Count all with pagination (comme app.mf.tsx)
    const resources = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    const mfCounts = await Promise.all(resources.map(async (r) => {
        try {
            let count = 0;
            let hasNextPage = true;
            let cursor: string | null = null;
            while (hasNextPage) {
                const res = await admin.graphql(`query getMetafieldDefinitionsCount($cursor: String, $ownerType: MetafieldOwnerType!) { metafieldDefinitions(ownerType: $ownerType, first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id } } }`, { variables: { cursor, ownerType: r } });
                const json = await res.json();
                const data = json?.data?.metafieldDefinitions;
                if (data?.nodes && Array.isArray(data.nodes)) {
                    count += data.nodes.length;
                }
                hasNextPage = data?.pageInfo?.hasNextPage || false;
                cursor = data?.pageInfo?.endCursor || null;
                if (count >= 10000) break; // Safety limit
            }
            return count;
        } catch (e) { 
            console.error(`Error counting metafields for ${r}:`, e);
            return 0; 
        }
    }));
    const mfCount = mfCounts.reduce((acc, curr) => acc + curr, 0);

    // 5. Media Count - Count all files with pagination
    let mediaCount = 0;
    let hasNextFilePage = true;
    let fileCursor: string | null = null;
    while (hasNextFilePage) {
        const filesRes = await admin.graphql(`query getFilesCount($cursor: String) { files(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id } } }`, { variables: { cursor: fileCursor } });
        const filesJson: any = await filesRes.json();
        const data: any = filesJson.data?.files;
        if (data?.nodes && Array.isArray(data.nodes)) {
            mediaCount += data.nodes.length;
        }
        hasNextFilePage = data?.pageInfo?.hasNextPage || false;
        fileCursor = data?.pageInfo?.endCursor || null;
        if (mediaCount >= 10000) break; // Safety limit
    }

    return { templateData, moCount, mfCount, totalTemplates: totalTemplatesCount, themeId, mediaCount, shop: session.shop };
};

export default function AppTemplates() {
    const { templateData, moCount, mfCount, totalTemplates, mediaCount, shop } = useLoaderData<typeof loader>();
    const location = useLocation();
    const revalidator = useRevalidator();
    const [search, setSearch] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Produits": true });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ template: TemplateItem; type: 'active' | 'inactive' } | null>(null);

    const columns = [
        { key: "name", label: "NOM DU TEMPLATE", className: "grow" },
        { key: "updated", label: "DATE DE CRÉATION", className: "w-[180px] whitespace-nowrap" },
        { key: "countActive", label: "ASSIGNATIONS ACTIVES", className: "w-[180px] whitespace-nowrap" },
        { key: "countInactive", label: "ASSIGNATIONS INACTIVES", className: "w-[180px] whitespace-nowrap" }
    ];

    const renderCell = (item: TemplateItem, columnKey: React.Key) => {
        switch (columnKey) {
            case "name": return (
                <div className="mf-cell mf-cell--multi">
                    <span className="mf-text--title">
                        {item.suffix ? `${item.type}.${item.suffix}` : item.type}
                    </span>
                    <span className="mf-text--desc">
                        {!item.suffix ? "(defaut template)" : item.key}
                    </span>
                </div>
            );
            case "updated": return (
                <div className="mf-cell mf-cell--start">
                    <span className="text-[14px] text-[#71717A]">{new Date(item.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
            );
            case "countActive": {
                const labels: Record<string, string> = { product: 'produit', collection: 'collection', page: 'page', blog: 'blog', article: 'article' };
                const label = labels[item.type] || item.type;
                const isClickable = item.countActive > 0;
                return (
                    <div className="mf-cell mf-cell--center whitespace-nowrap">
                        <span 
                            className={`mf-badge--count ${item.countActive > 0 ? 'bg-[#4BB961]/10 text-[#15803D]' : 'bg-[#E4E4E7]/50 text-[#71717A]'} ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            onClick={isClickable ? () => {
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
                    <div className="mf-cell mf-cell--center whitespace-nowrap">
                        <span 
                            className={`mf-badge--count ${item.countInactive > 0 ? 'bg-[#F43F5E]/10 text-[#DC2626]' : 'bg-[#E4E4E7]/50 text-[#71717A]'} ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            onClick={isClickable ? () => {
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
        <div className="min-h-screen bg-white animate-in fade-in duration-500">
            <div className="mx-auto px-6 py-6 space-y-6" style={{ maxWidth: '1800px' }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]">
                    <AppBrand />
                    <BasilicButton 
                        variant="flat" 
                        className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]" 
                        isLoading={revalidator.state === "loading"}
                        onPress={() => revalidator.revalidate()} 
                        icon={revalidator.state === "loading" ? null : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>}
                    >
                        Scan Code
                    </BasilicButton>
                </div>

                <div className="flex items-center justify-between w-full">
                    <NavigationTabs activePath={location.pathname} counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount }} />
                    <div className="flex-shrink-0" style={{ width: '320px' }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher un template..." />
                    </div>
                </div>

                {search ? (
                    filteredSearch.length > 0 ? (
                        <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mf-section__header mf-section__header--open">
                                <div className="mf-section__title-group">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                    <span className="mf-section__title">Résultats</span>
                                    <span className="mf-section__count">{filteredSearch.length}</span>
                                </div>
                            </div>
                            <div className="mf-table__base">
                                <Table aria-label="Résultats" removeWrapper selectionMode="none" className="mf-table mf-table--templates" classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}>
                                    <TableHeader columns={columns}>{(c) => <TableColumn key={c.key} align={c.key === "countActive" || c.key === "countInactive" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>}</TableHeader>
                                    <TableBody items={filteredSearch}>{(item) => <TableRow key={item.key}>{(ck) => <TableCell>{renderCell(item, ck)}</TableCell>}</TableRow>}</TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-[#F4F4F5]/50 rounded-[32px] border-2 border-dashed border-[#E4E4E7]"><div className="text-[17px] font-semibold text-[#18181B]">Aucun résultat trouvé.</div></div>
                    )
                ) : (
                    <div className="space-y-4">
                        {sections.map(s => {
                            const data = (templateData as Record<string, any[]>)[s.type] || [];
                            if (data.length === 0) return null;
                            const isOpen = openSections[s.label];
                            return (
                                <div key={s.type} className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className={`mf-section__header ${isOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`} onClick={() => setOpenSections(p => ({ ...p, [s.label]: !p[s.label] }))}>
                                        <div className="mf-section__title-group"><span className="mf-section__icon">{s.icon}</span><span className="mf-section__title">{s.label}</span><span className="mf-section__count">{data.length}</span></div>
                                        <span className={`mf-section__chevron ${isOpen ? 'mf-section__chevron--open' : ''}`}><Icons.ChevronRight /></span>
                                    </div>
                                    {isOpen && (
                                        <div className="mf-table__base">
                                            <Table aria-label={s.label} removeWrapper selectionMode="none" className="mf-table mf-table--templates" classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}>
                                                <TableHeader columns={columns}>{(c: any) => (<TableColumn key={c.key} align={c.key === "countActive" || c.key === "countInactive" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>)}</TableHeader>
                                                <TableBody items={data} emptyContent="Aucun template trouvé.">{(item: any) => (<TableRow key={item.key}>{(ck) => <TableCell>{renderCell(item, ck)}</TableCell>}</TableRow>)}</TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal pour afficher les produits assignés */}
            <Modal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)}
                size="2xl"
                scrollBehavior="inside"
                classNames={{
                    base: "bg-white",
                    header: "border-b border-[#E4E4E7]",
                    body: "py-6",
                    footer: "border-t border-[#E4E4E7]"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="text-[20px] font-semibold text-[#18181B]">
                                    {modalData?.template.name}
                                </div>
                                <div className="text-[14px] text-[#71717A] font-normal">
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
                                            ? (modalData.template.resourcesActive.length > 1 ? 's' : '')
                                            : (modalData?.template.resourcesInactive.length > 1 ? 's' : '');
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
                                    const hoverBorderColor = isActive ? 'hover:border-[#4BB961]' : 'hover:border-[#F43F5E]';
                                    const hoverTextColor = isActive ? 'group-hover:text-[#4BB961]' : 'group-hover:text-[#F43F5E]';
                                    const badgeColor = isActive 
                                        ? 'bg-[#4BB961]/10 text-[#15803D]' 
                                        : 'bg-[#F43F5E]/10 text-[#DC2626]';
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
                                                                className={`flex items-center justify-between p-3 bg-[#F4F4F5] rounded-lg border border-[#E4E4E7] hover:bg-[#E4E4E7] ${hoverBorderColor} transition-all cursor-pointer group`}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className={`text-[15px] font-medium text-[#18181B] ${hoverTextColor} transition-colors`}>
                                                                        {resource.title}
                                                                    </div>
                                                                    <div className="text-[12px] text-[#71717A] mt-1">
                                                                        ID: {resourceId}
                                                                        {modalData.template.type === 'product' && resource.status && ` • Status: ${resource.status}`}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-1 text-[12px] font-medium ${badgeColor} rounded`}>
                                                                        {badgeText}
                                                                    </span>
                                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <path d="M6 3L11 8L6 13" stroke={arrowColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                    </svg>
                                                                </div>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-[#71717A]">
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
                                    className="text-[#18181B]"
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
