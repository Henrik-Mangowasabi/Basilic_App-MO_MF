import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useRevalidator, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import "../styles/metafields-table.css";
import { AppBrand, BasilicSearch, NavigationTabs, BasilicButton, BasilicModal } from "../components/BasilicUI";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Pagination } from "@heroui/react";



const Icons = {
    Link: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>),
    VerticalDots: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}><path opacity="0.5" d="M4 8C4 8.55228 3.55228 9 3 9C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7C3.55228 7 4 7.44772 4 8Z" fill="#18181B"/><path opacity="0.5" d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" fill="#18181B"/><path opacity="0.5" d="M14 8C14 8.55228 13.5523 9 13 9C12.4477 9 12 8.55228 12 8C12 7.44772 12.4477 7 13 7C13.5523 7 14 7.44772 14 8Z" fill="#18181B"/></svg>),
    Edit: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>),
    Delete: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>),
    Sparkles: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>),
    Video: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>),
    Image: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>),
};

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const loader = async ({ request }: any) => {
    const { admin, session } = await authenticate.admin(request);
    
    // 1. Fetch ALL Media Files (Paginated)
    let allMediaNodes: any[] = [];
    let hasNextFilePage = true;
    let fileCursor = null;
    let totalMediaCount = 0;
    let reachedLimit = false;

    while (hasNextFilePage) {
        const filesRes = await admin.graphql(`
            query getFiles($cursor: String) {
                files(first: 250, after: $cursor) {
                    pageInfo { hasNextPage endCursor }
                    nodes {
                        __typename
                        id
                        createdAt
                        alt
                        ... on GenericFile {
                            url
                            mimeType
                            fileSize: originalFileSize
                        }
                        ... on MediaImage {
                            image { url }
                            originalSource { fileSize }
                            preview { image { url } }
                        }
                        ... on Video {
                            originalSource { 
                                url
                                fileSize
                                mimeType
                            }
                            preview { image { url } }
                        }
                    }
                }
            }
        `, { variables: { cursor: fileCursor } });
        const filesJson = await filesRes.json();
        const data = filesJson.data?.files;
        if (data?.nodes && Array.isArray(data.nodes)) {
            allMediaNodes = [...allMediaNodes, ...data.nodes];
            totalMediaCount += data.nodes.length;
        }
        hasNextFilePage = data?.pageInfo?.hasNextPage || false;
        fileCursor = data?.pageInfo?.endCursor || null;
        
        // Error handling
        if (filesJson.errors) {
            console.error("Error fetching files:", filesJson.errors);
            break;
        }
        
        // Safety break (approx 5000 files max for performance - increased for real stores)
        if (allMediaNodes.length >= 5000) {
            reachedLimit = true;
            break;
        }
    }

    // 2. SCAN ALL PRODUCTS (to get references)
    let hasNextProductPage = true;
    let productCursor = null;
    const productUsageMap: Record<string, number> = {};

    while (hasNextProductPage) {
        const productMediaRes = await admin.graphql(`
            query getProductMedia($cursor: String) {
                products(first: 250, after: $cursor) {
                    pageInfo { hasNextPage endCursor }
                    nodes {
                        media(first: 50) {
                            nodes {
                                id
                            }
                        }
                    }
                }
            }
        `, { variables: { cursor: productCursor } });
        
        const json = await productMediaRes.json();
        const data = json.data?.products;
        
        if (data?.nodes && Array.isArray(data.nodes)) {
            data.nodes.forEach((p: any) => {
                if (p.media?.nodes && Array.isArray(p.media.nodes)) {
                    p.media.nodes.forEach((m: any) => {
                        if (m?.id) {
                            productUsageMap[m.id] = (productUsageMap[m.id] || 0) + 1;
                        }
                    });
                }
            });
        }

        hasNextProductPage = data?.pageInfo?.hasNextPage || false;
        productCursor = data?.pageInfo?.endCursor || null;
        
        // Error handling
        if (json.errors) {
            console.error("Error fetching product media:", json.errors);
            break;
        }

        // Safety break (approx 10000 products max for performance - increased for real stores)
        if (Object.keys(productUsageMap).length > 10000) break; 
    }

    const mediaItems = allMediaNodes.map((n: any) => {
        let filename = "-";
        let url = "";
        let previewUrl = "";
        let fileSize = 0;
        let mimeType = "";

        if (n.__typename === 'MediaImage') {
            url = n.image?.url || "";
            previewUrl = url;
            filename = url.split('/').pop()?.split('?')[0] || "image";
            fileSize = n.originalSource?.fileSize || 0;
            mimeType = "image/" + (filename.split('.').pop() || "jpeg");
        } else if (n.__typename === 'Video') {
            url = n.originalSource?.url || "";
            previewUrl = n.preview?.image?.url || "";
            filename = url.split('/').pop()?.split('?')[0] || "video";
            fileSize = n.originalSource?.fileSize || 0;
            mimeType = n.originalSource?.mimeType || "";
        } else if (n.__typename === 'GenericFile') {
            url = n.url || "";
            previewUrl = ""; 
            filename = url.split('/').pop()?.split('?')[0] || "file";
            fileSize = n.fileSize || 0;
            mimeType = n.mimeType || "";
        }
        
        return {
            id: n.id,
            alt: n.alt || "",
            createdAt: n.createdAt,
            fileSize,
            mimeType,
            url,
            previewUrl,
            filename,
            referencesCount: productUsageMap[n.id] || 0,
            type: n.__typename === 'MediaImage' ? 'IMAGE' : (n.__typename === 'Video' ? 'VIDEO' : 'FILE')
        };
    });

    // 3. COUNTS (for navigation)
    // Use totalMediaCount to get accurate count, but if we hit the limit, use the loaded count
    const mediaCount = reachedLimit ? allMediaNodes.length : mediaItems.length;

    // Metaobjects Count - Count all with pagination (comme app.mo.tsx)
    let moCount = 0;
    let hasNextMoPage = true;
    let moCursor: string | null = null;
    while (hasNextMoPage) {
        const moRes = await admin.graphql(`query getMetaobjectDefinitionsCount($cursor: String) { metaobjectDefinitions(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id } } }`, { variables: { cursor: moCursor } });
        const moJson: any = await moRes.json();
        const data: any = moJson.data?.metaobjectDefinitions;
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

    // Templates Count
    const themesRes = await admin.graphql(`{ themes(first: 1, roles: [MAIN]) { nodes { id } } }`);
    const themesData = await themesRes.json();
    const activeThemeId = themesData.data?.themes?.nodes?.[0]?.id.split('/').pop();
    let totalTemplates = 0;
    
    if (activeThemeId) {
        // Use a consistent API version for assets
        const assetsRes = await fetch(`https://${session.shop}/admin/api/2024-10/themes/${activeThemeId}/assets.json`, {
            headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
        });
        const assetsJson = await assetsRes.json();
        const managedTypes = ['product', 'collection', 'page', 'blog', 'article'];
        totalTemplates = (assetsJson.assets || []).filter((a: any) => {
            if (!a.key.startsWith('templates/') || !a.key.endsWith('.json')) return false;
            const type = a.key.replace('templates/', '').split('.')[0];
            return managedTypes.includes(type);
        }).length;
    }

    return { mediaItems, moCount, mfCount, totalTemplates, mediaCount };
};

export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const fd = await request.formData();
    const actionType = fd.get("action");

    if (actionType === "update_file") {
        const id = fd.get("id");
        const alt = fd.get("alt");
        // Shopify mutation for file update
        await admin.graphql(`
            mutation fileUpdate($input: [FileUpdateInput!]!) {
                fileUpdate(files: $input) {
                    files { id alt }
                    userErrors { field message }
                }
            }
        `, { variables: { input: [{ id, alt }] } });
        return { ok: true };
    }

    if (actionType === "delete_files") {
        const ids = JSON.parse(fd.get("ids") as string || "[]");
        await admin.graphql(`
            mutation fileDelete($ids: [ID!]!) {
                fileDelete(fileIds: $ids) {
                    deletedFileIds
                    userErrors { field message }
                }
            }
        `, { variables: { ids } });
        return { ok: true };
    }

    return null;
};

const ITEMS_PER_PAGE = 50;

export default function AppMedia() {
    const { mediaItems, moCount, mfCount, totalTemplates, mediaCount } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const submit = useSubmit();
    const [search, setSearch] = useState("");
    const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
    const [modalData, setModalData] = useState<any>(null);
    const [editAlt, setEditAlt] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renamePrefix, setRenamePrefix] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const columns = [
        { key: "file", label: "NOM DU FICHIER", className: "grow" },
        { key: "alt", label: "TEXTE ALTERNATIF", className: "w-[250px]" },
        { key: "date", label: "DATE D'AJOUT", className: "w-[150px]" },
        { key: "size", label: "TAILLE", className: "w-[120px]" },
        { key: "refs", label: "RÉFÉRENCES", className: "w-[140px]" },
        { key: "menu", label: " ", className: "w-[50px]" }
    ];

    const renderCell = (item: any, key: React.Key) => {
        switch (key) {
            case "file": return (
                <div className="mf-cell mf-cell--multi items-center flex-row gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-default-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {item.type === 'IMAGE' ? (
                            <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Icons.Video className="text-default-400" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="mf-text--title truncate font-medium">{item.filename}</span>
                        <span className="mf-text--desc uppercase text-[10px] font-bold tracking-wider">{item.type}</span>
                    </div>
                </div>
            );
            case "alt": return (
                <div className="mf-cell">
                    <span className={`text-[13px] ${item.alt ? 'text-[#18181B]' : 'text-[#A1A1AA] italic'}`}>
                        {item.alt || "Aucun texte alternatif"}
                    </span>
                </div>
            );
            case "date": return (
                <div className="mf-cell">
                    <span className="text-[13px] text-[#71717A]">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
            );
            case "size": return (
                <div className="mf-cell">
                    <span className="text-[13px] text-[#71717A]">{formatSize(item.fileSize)}</span>
                </div>
            );
            case "refs": return (
                <div className="mf-cell">
                    <span className={`mf-badge--count ${item.referencesCount > 0 ? 'bg-[#4BB961]/10 text-[#4BB961]' : 'bg-default-100 text-default-400'}`}>
                        {item.referencesCount} référence{item.referencesCount > 1 ? 's' : ''}
                    </span>
                </div>
            );
            case "menu": return (
                <div className="mf-cell">
                    <Dropdown classNames={{ content: "mf-dropdown-content" }}>
                        <DropdownTrigger>
                            <Button isIconOnly variant="light" size="sm" className="w-8 h-8"><Icons.VerticalDots /></Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Actions" onAction={(k) => { 
                            if (k === 'edit') { setModalData(item); setEditAlt(item.alt); }
                            else if (k === 'delete') { setSelectedKeys(new Set([item.id])); setDeleteModalOpen(true); }
                        }}>
                            <DropdownItem key="edit" startContent={<Icons.Edit />} className="mf-dropdown-item"><span className="mf-dropdown-item__title">Editer</span></DropdownItem>
                            <DropdownItem key="delete" startContent={<Icons.Delete />} className="mf-dropdown-item mf-dropdown-item--delete"><span className="mf-dropdown-item__title">Supprimer</span></DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </div>
            );
            default: return null;
        }
    };

    const filteredItems = useMemo(() => {
        const s = norm(search);
        return mediaItems.filter((i: any) => norm(i.filename).includes(s) || norm(i.alt).includes(s));
    }, [search, mediaItems]);

    // Pagination
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredItems.slice(startIndex, endIndex);
    }, [filteredItems, currentPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <div className="min-h-screen bg-white animate-in fade-in duration-500">
            <div className="mx-auto px-6 pt-6 pb-32 space-y-6" style={{ maxWidth: "1800px" }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]">
                    <AppBrand />
                    <div className="flex gap-3">
                        <BasilicButton 
                            variant="flat" 
                            className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]" 
                            isLoading={revalidator.state === "loading"}
                            onPress={() => revalidator.revalidate()} 
                            icon={revalidator.state === "loading" ? null : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>}
                        >
                            Sync Médias
                        </BasilicButton>
                        <BasilicButton 
                            icon={<Icons.Sparkles className="text-white" />}
                            className="bg-[#4BB961] text-white"
                        >
                            Générer tous les Alt textes
                        </BasilicButton>
                    </div>
                </div>

                <div className="flex items-center justify-between w-full">
                    <NavigationTabs activePath="/app/media" counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount }} />
                    <div style={{ width: '320px' }}><BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher un média..." /></div>
                </div>

                <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mf-section__header mf-section__header--open">
                        <div className="mf-section__title-group">
                            <Icons.Image className="text-[#4BB961]" />
                            <span className="mf-section__title">{search ? 'Résultats de recherche' : 'Tous les Fichiers'}</span>
                            <span className="mf-section__count">{filteredItems.length}</span>
                        </div>
                    </div>
                    <div className="mf-table__base">
                        <Table 
                            aria-label="Table des médias" 
                            removeWrapper 
                            selectionMode="multiple" 
                            selectedKeys={selectedKeys}
                            onSelectionChange={setSelectedKeys}
                            className="mf-table mf-table--media" 
                            classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}
                        >
                            <TableHeader columns={columns}>{(c) => <TableColumn key={c.key} align={c.key === "menu" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>}</TableHeader>
                            <TableBody items={paginatedItems} emptyContent="Aucun fichier trouvé.">
                                {(item: any) => (<TableRow key={item.id}>{(ck) => <TableCell>{renderCell(item, ck)}</TableCell>}</TableRow>)}
                            </TableBody>
                        </Table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-[#E4E4E7]">
                            <div className="text-sm text-[#71717A]">
                                Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} sur {filteredItems.length} médias
                            </div>
                            <Pagination
                                total={totalPages}
                                page={currentPage}
                                onChange={setCurrentPage}
                                showControls
                                classNames={{
                                    wrapper: "gap-0",
                                    item: "w-8 h-8 text-sm rounded-lg bg-transparent",
                                    cursor: "bg-[#4BB961] text-white font-semibold",
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* SELECTION BAR */}
            {selectedKeys.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-2xl ring-1 ring-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-[14px] font-medium text-white">{selectedKeys === "all" ? paginatedItems.length : selectedKeys.size} sélectionnés</span>
                            <button onClick={() => setSelectedKeys(new Set([]))} className="text-[#A1A1AA] hover:text-white transition-colors">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><g opacity="0.8"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6023 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6023 5.39763 18.3333 10 18.3333Z" fill="#3F3F46"/><path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></g></svg>
                            </button>
                        </div>
                        <div className="h-6 w-[1px] bg-[#3F3F46]"></div>
                        <div className="flex gap-2">
                            <Button 
                                onPress={() => setRenameModalOpen(true)}
                                className="bg-white/10 text-white font-medium px-4 h-[36px] rounded-full hover:bg-white/20 transition-colors"
                            >
                                Renommer en groupe
                            </Button>
                            <Button 
                                onPress={() => setDeleteModalOpen(true)}
                                className="bg-[#F43F5E] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#E11D48] transition-colors gap-2" 
                                startContent={<Icons.Delete />}
                            >
                                Supprimer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            <BasilicModal isOpen={!!modalData} onClose={() => setModalData(null)} title="Editer le média" footer={<><Button variant="light" onPress={() => setModalData(null)} className="grow bg-[#F4F4F5]">Annuler</Button><BasilicButton className="grow" onPress={() => { submit({ action: 'update_file', id: modalData.id, alt: editAlt }, { method: 'post' }); setModalData(null); }}>Enregistrer</BasilicButton></>}>
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 p-3 bg-default-50 rounded-xl">
                        <img src={modalData?.previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold truncate max-w-[200px]">{modalData?.filename}</span>
                            <span className="text-xs text-default-400">{modalData?.type} • {formatSize(modalData?.fileSize)}</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="media-alt" className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5 block">Texte Alternatif (Alt)</label>
                        <textarea 
                            id="media-alt"
                            value={editAlt} 
                            onChange={e => setEditAlt(e.target.value)} 
                            className="w-full h-24 p-3 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] resize-none" 
                            placeholder="Décrivez l'image..."
                        />
                    </div>
                </div>
            </BasilicModal>

            <BasilicModal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} title="Renommer en groupe" footer={<><Button variant="light" onPress={() => setRenameModalOpen(false)} className="grow bg-[#F4F4F5]">Annuler</Button><BasilicButton className="grow">Appliquer</BasilicButton></>}>
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-[#71717A]">Ajoutez un préfixe à tous les fichiers sélectionnés (ex: image_produit_).</p>
                    <input 
                        value={renamePrefix} 
                        onChange={e => setRenamePrefix(e.target.value)} 
                        className="w-full h-11 px-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] font-semibold" 
                        placeholder="Préfixe..."
                    />
                </div>
            </BasilicModal>

            <BasilicModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmer suppression" footer={<><Button variant="light" onPress={() => setDeleteModalOpen(false)} className="grow bg-[#F4F4F5]">Annuler</Button><Button color="danger" onPress={() => { submit({ action: 'delete_files', ids: JSON.stringify(Array.from(selectedKeys)) }, { method: 'post' }); setSelectedKeys(new Set([])); setDeleteModalOpen(false); }} className="grow bg-[#F43F5E] text-white">Confirmer</Button></>}>
                <p className="py-2 text-sm">Voulez-vous vraiment supprimer {selectedKeys === "all" ? paginatedItems.length : selectedKeys.size} fichier{selectedKeys.size > 1 ? 's' : ''} ? Cette action est irréversible.</p>
            </BasilicModal>
        </div>
    );
}
