import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getMetafieldCount, getMetaobjectCount, getMediaCount, getActiveThemeId, getSectionsCount, getTemplatesCount } from "../utils/graphql-helpers.server";
import { getReviewStatusMap } from "../utils/reviewStatus.server";
import { createRouteAction } from "../utils/createRouteAction";
import "../styles/metafields-table.css";
import "../styles/basilic-ui.css";
import { useScan } from "../components/ScanProvider";
import { AppBrand, BasilicSearch, NavigationTabs, BasilicButton, BasilicModal, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "../components/BasilicUI";
import { Icons } from "../components/Icons";
import { useReviewStatus } from "../hooks/useReviewStatus";
import { useTableSelection } from "../hooks/useTableSelection";
import { useNormSearch } from "../hooks/useNormSearch";
import { SelectionActionBar } from "../components/SelectionActionBar";

interface MenuItem {
    id: string;
    name: string;
    handle: string;
    inCode: boolean;
}

export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    
    const domain = (await admin.graphql(`{ shop { myshopifyDomain } }`).then((r: Response) => r.json())).data?.shop?.myshopifyDomain as string;
    if (!domain) {
        const reviewStatusMapEarly = await getReviewStatusMap(db, "", "menus");
        return { menus: [], menusError: "Shop non trouvé.", storeSlug: "", mfCount: 0, moCount: 0, totalTemplates: 0, mediaCount: 0, menuCount: 0, reviewStatusMap: reviewStatusMapEarly };
    }

    const activeThemeId = await getActiveThemeId(admin);
    
    const [mfCount, moCount, mediaCount, menusResult, totalTemplates, sectionsCount] = await Promise.all([
        getMetafieldCount(admin, domain),
        getMetaobjectCount(admin, domain),
        getMediaCount(admin, domain),
        (async () => {
            let menus: { id: string; name: string; handle: string }[] = [];
            let menusError: string | null = null;
            try {
                let cursor: string | null = null;
                for (;;) {
                    const res = await admin.graphql(
                        `query getMenus($cursor: String) {
                            menus(first: 250, after: $cursor) {
                                pageInfo { hasNextPage endCursor }
                                nodes { id title handle }
                            }
                        }`,
                        { variables: { cursor } }
                    );
                    const json = (await res.json()) as any;
                    const gqlErrors = json.errors;
                    if (gqlErrors?.length) {
                        menusError = gqlErrors.map((e: any) => e.message).join(" ");
                        break;
                    }
                    const data = json.data?.menus;
                    if (!data?.nodes?.length) break;
                    menus = [...menus, ...data.nodes.map((n: any) => ({ id: n.id, name: n.title || n.handle || "-", handle: n.handle || "" }))];
                    if (!data.pageInfo?.hasNextPage) break;
                    cursor = data.pageInfo.endCursor;
                    if (menus.length >= 500) break;
                }
            } catch (e) {
                menusError = e instanceof Error ? e.message : String(e);
            }
            return { menus, menusError };
        })(),
        getTemplatesCount(admin, domain, session.accessToken!),
        getSectionsCount(admin, domain, session.accessToken!)
    ]);

    const { menus, menusError } = menusResult;
    const menuData: MenuItem[] = menus.map((m) => ({ ...m, inCode: false }));

    const reviewStatusMap = await getReviewStatusMap(db, domain, "menus");

    const storeSlug = domain.replace(".myshopify.com", "");
    return {
        menus: menuData,
        menusError,
        domain,
        storeSlug,
        mfCount,
        moCount,
        totalTemplates,
        sectionsCount,
        mediaCount,
        menuCount: menuData.length,
        reviewStatusMap,
    };
};

export const action = createRouteAction({
    source: "menus",
    handlers: {
        update: async (formData, admin, shop) => {
            const id = formData.get("id") as string;
            const title = (formData.get("title") as string) || "";
            const handle = (formData.get("handle") as string) || "";
            try {
                const menuRes = await admin.graphql(`query getMenu($id: ID!) { menu(id: $id) { id title handle items { id title url resourceId type items { id title url resourceId type items { id title url resourceId type } } } } }`, { variables: { id } });
                const menuJson = await menuRes.json();
                const menu = menuJson.data?.menu;
                if (!menu) return { ok: false, errors: [{ message: "Menu introuvable" }] };
                const toInput = (item: any): any => ({ id: item.id, title: item.title || "", type: item.type || "FRONTPAGE", items: item.items?.map(toInput) || [], url: item.url, resourceId: item.resourceId });
                const items = (menu.items || []).map(toInput);
                const updateRes = await admin.graphql(`mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { id } userErrors { message } } }`, { variables: { id, title: title.trim(), handle: handle.trim() || menu.handle, items } });
                const updateJson = await updateRes.json();
                const errs = updateJson.data?.menuUpdate?.userErrors || [];
                if (errs.length) return { ok: false, errors: errs };
                return { ok: true, action: "update" };
            } catch (e) {
                return { ok: false, errors: [{ message: "Erreur update" }] };
            }
        }
    }
});

export default function AppMenu() {
    const { menus, menusError, storeSlug, mfCount, moCount, totalTemplates, sectionsCount, mediaCount, menuCount, reviewStatusMap } = useLoaderData<typeof loader>();
    const { setReviewStatus, clearReviewStatus, revalidator } = useReviewStatus();
    const { selectedKeys, handleSelectionChange, clearSelection } = useTableSelection();
    const { search, setSearch, filteredItems: filtered } = useNormSearch(
        menus,
        (item) => [item.name, item.handle]
    );
    const submit = useSubmit();
    const actionData = useActionData<any>();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<MenuItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editHandle, setEditHandle] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ single: MenuItem | null; ids: string[] }>({ single: null, ids: [] });
    const [toast, setToast] = useState<{ title: string; msg: string } | null>(null);
    const [isTableOpen, setIsTableOpen] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });
    const { isScanning, menuResults, startScan } = useScan();

    const handleSort = (columnKey: string) => {
        setSortConfig(prev => {
            if (prev.column === columnKey) {
                return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                return { column: columnKey, direction: 'asc' };
            }
        });
    };

    const sortData = (data: MenuItem[]) => {
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
        if (!actionData) return;
        if (actionData.ok) {
            clearSelection();
            setEditModalOpen(false);
            setToast({ title: "Succès", msg: "Action effectuée." });
            revalidator.revalidate();
        } else if (actionData.errors?.length) {
            setToast({ title: "Erreur", msg: actionData.errors[0].message });
        }
    }, [actionData, revalidator, clearSelection]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const getMenuAdminUrl = (item: MenuItem) => `https://admin.shopify.com/store/${storeSlug}/content/menus/${item.id.split("/").pop()}`;

    const renderCell = (item: MenuItem, key: React.Key) => {
        switch (key) {
            case "name": return (<div className="mf-cell mf-cell--multi"><span className="mf-text--title">{item.name}</span></div>);
            case "handle": return (<div className="mf-cell mf-cell--key"><span className="mf-text--key text-gray-900">{item.handle || "—"}</span></div>);
            case "inCode": {
                const inCode = menuResults.has(item.handle);
                return (<div className="mf-cell mf-cell--center mf-cell--badge"><span className={`mf-badge--code ${inCode ? "mf-badge--found" : ""} ${!inCode ? "text-gray-900" : ""}`}>{inCode ? "Oui" : "Non"}</span></div>);
            }
            case "actions": return (<div className="mf-cell mf-cell--center"><a href={getMenuAdminUrl(item)} target="_blank" rel="noopener noreferrer" className="mf-action-link"><Icons.Link /></a></div>);
            case "menu": return (
                <div className="mf-cell mf-cell--center">
                    <Dropdown classNames={{ content: "mf-dropdown-content" }} placement="bottom-end" portalContainer={typeof document !== 'undefined' ? document.body : undefined}>
                        <DropdownTrigger><Button isIconOnly variant="light" size="sm" className="w-8 h-8"><Icons.VerticalDots /></Button></DropdownTrigger>
                        <DropdownMenu aria-label="Actions" onAction={(k) => {
                            if (k === "edit") { setEditItem(item); setEditName(item.name); setEditHandle(item.handle); setEditModalOpen(true); }
                            if (k === "delete") { setDeleteTarget({ single: item, ids: [item.id] }); setDeleteModalOpen(true); }
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

    return (
        <div className="page">
            <div className="page-content page-content--wide space-y-6">
                <div className="page-header">
                    <AppBrand />
                    <BasilicButton variant="flat" className="btn-secondary" isLoading={isScanning} onPress={() => startScan()} icon={isScanning ? null : <Icons.Refresh />}>
                        Scan code
                    </BasilicButton>
                </div>
                <div className="page-nav-row">
                    <NavigationTabs activePath="/app/menu" counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount, sections: sectionsCount }} />
                    <div style={{ width: "320px" }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher un menu…" />
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="empty-state animate-in fade-in">
                        <div className="empty-state__title">Aucun menu trouvé</div>
                    </div>
                ) : (
                    <div className="mf-section animate-in fade-in slide-in-from-bottom duration-500">
                        <div className={`mf-section__header ${isTableOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`} onClick={() => setIsTableOpen(!isTableOpen)}>
                            <div className="mf-section__title-group">
                                <span className="mf-section__icon"><Icons.Menu /></span>
                                <span className="mf-section__title">Menus</span>
                                <span className="mf-section__count">{filtered.length}</span>
                            </div>
                            <span className={`mf-section__chevron ${isTableOpen ? 'rotate-180' : ''}`} style={{ transition: 'transform 0.2s' }}>
                                <Icons.ChevronDown />
                            </span>
                        </div>
                        {isTableOpen && (
                            <div className="mf-table__base animate-in fade-in duration-300">
                                <Table aria-label="Menus" removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={selectedKeys as any} onSelectionChange={(keys) => handleSelectionChange(filtered, keys)} className="mf-table mf-table--menus" classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}>
                                    <TableHeader>{[
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
                                                        <span>NOM DU MENU</span>
                                                        {sortConfig.column === 'name' ? (
                                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className={`mf-sort-icon ${sortConfig.direction === 'desc' ? 'mf-sort-icon--desc' : ''}`}>
                                                                <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        ) : (
                                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="mf-sort-icon mf-sort-icon--neutral">
                                                                <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                                <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                ),
                                                className: "mf-col--name"
                                            },
                                            { key: "handle", label: "HANDLE", className: "mf-col--key" },
                                            { key: "inCode", label: "DANS LE CODE (TEMPLATES)", className: "mf-col--code" },
                                            { key: "actions", label: "LIEN", className: "mf-col--actions" },
                                            { key: "menu", label: " ", className: "mf-col--menu" }
                                        ].map((c: any) => (<TableColumn key={c.key} align={c.key === "inCode" || c.key === "actions" || c.key === "menu" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>))}</TableHeader>
                                    <TableBody items={sortData(filtered)} emptyContent="Aucun menu.">{(item: any) => (<TableRow key={item.id} rowKey={item.id} className={reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.id] === "reviewed" ? "mf-table__row--reviewed" : undefined}>{[{ key: "name" }, { key: "handle" }, { key: "inCode" }, { key: "actions" }, { key: "menu" }].map((c) => <TableCell key={c.key}>{renderCell(item, c.key)}</TableCell>)}</TableRow>)}</TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SelectionActionBar
                selectedCount={selectedKeys.size}
                onClearSelection={clearSelection}
                onMarkToReview={() => setReviewStatus(Array.from(selectedKeys), "to_review")}
                onMarkReviewed={() => setReviewStatus(Array.from(selectedKeys), "reviewed")}
                onClearReviewStatus={() => clearReviewStatus(Array.from(selectedKeys))}
                onDelete={() => {
                    setDeleteTarget({ single: null, ids: Array.from(selectedKeys) });
                    setDeleteModalOpen(true);
                }}
                showDelete={true}
            />

            <BasilicModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editer le menu" footer={<><Button variant="light" onPress={() => setEditModalOpen(false)} className="btn-modal-cancel">Annuler</Button><BasilicButton className="grow" onPress={() => { const fd = new FormData(); fd.append("action", "update"); fd.append("id", editItem?.id!); fd.append("title", editName); fd.append("handle", editHandle); submit(fd, { method: "post" }); }}>Enregistrer</BasilicButton></>}><div className="space-y-4 pt-2"><div><label className="form-label">Nom</label><input value={editName} onChange={(e) => setEditName(e.target.value)} className="form-input" /></div><div><label className="form-label">Handle</label><input value={editHandle} onChange={(e) => setEditHandle(e.target.value)} className="form-input form-input--mono" /></div></div></BasilicModal>
            <BasilicModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Suppression de menus" footer={<><Button variant="light" onPress={() => setDeleteModalOpen(false)} className="btn-modal-cancel">Fermer</Button><a href={deleteTarget.single ? getMenuAdminUrl(deleteTarget.single) : `https://admin.shopify.com/store/${storeSlug}/content/menus`} target="_blank" rel="noopener noreferrer" className="btn-modal-link">Ouvrir l&apos;admin Shopify</a></>}><p className="py-2 text-sm text-gray-500">La suppression de menus n&apos;est pas disponible via l&apos;API. Supprimez les menus depuis l&apos;admin Shopify.</p></BasilicModal>
            {toast && (<div className="mf-toast"><div className="mf-toast__content"><span className="mf-toast__title">{toast.title}</span><span className="mf-toast__message">{toast.msg}</span></div></div>)}
        </div>
    );
}
