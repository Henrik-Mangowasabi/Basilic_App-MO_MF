import { useState, useMemo, useEffect } from "react";
import { useLoaderData, useRevalidator, useSubmit, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getMetafieldCount, getMetaobjectCount, getMediaCount, getActiveThemeId } from "../utils/graphql-helpers.server";
import "../styles/metafields-table.css";
import { useScan } from "../components/ScanProvider";
import { AppBrand, BasilicSearch, NavigationTabs, BasilicButton, BasilicModal } from "../components/BasilicUI";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

interface MenuItem {
    id: string;
    name: string;
    handle: string;
    inCode: boolean;
}

const Icons = {
    Menu: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
    ),
    VerticalDots: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
            <path opacity="0.5" d="M4 8C4 8.55228 3.55228 9 3 9C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7C3.55228 7 4 7.44772 4 8Z" fill="#18181B"/>
            <path opacity="0.5" d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" fill="#18181B"/>
            <path opacity="0.5" d="M14 8C14 8.55228 13.5523 9 13 9C12.4477 9 12 8.55228 12 8C12 7.44772 12.4477 7 13 7C13.5523 7 14 7.44772 14 8Z" fill="#18181B"/>
        </svg>
    ),
    Link: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.8509L12.6642 2.79552C14.0586 1.39569 16.2064 1.28221 17.4613 2.54205C18.7163 3.8019 18.6033 5.95797 17.2088 7.35779L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path opacity="0.5" d="M11.6278 8.33333C12.8828 9.59318 12.7698 11.7492 11.3753 13.1491L9.3555 15.1768L7.33566 17.2045C5.94124 18.6043 3.79348 18.7178 2.53851 17.4579C1.28353 16.1981 1.39658 14.042 2.79099 12.6422L4.81086 10.6145" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
    Edit: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" {...props}><path d="M12.739 2.62648L11.9666 3.39888L4.86552 10.4999C4.38456 10.9809 4.14407 11.2214 3.93725 11.4865C3.69328 11.7993 3.48412 12.1378 3.31346 12.4959C3.16878 12.7994 3.06123 13.1221 2.84614 13.7674L1.93468 16.5017L1.71188 17.1701C1.60603 17.4877 1.68867 17.8378 1.92536 18.0745C2.16205 18.3112 2.51215 18.3938 2.8297 18.288L3.4981 18.0652L6.23249 17.1537C6.87777 16.9386 7.20042 16.8311 7.50398 16.6864C7.86208 16.5157 8.20052 16.3066 8.51331 16.0626C8.77847 15.8558 9.01895 15.6153 9.49992 15.1343L16.601 8.03328L17.3734 7.26088C18.6531 5.98113 18.6531 3.90624 17.3734 2.62648C16.0936 1.34673 14.0187 1.34673 12.739 2.62648Z" stroke="currentColor" strokeWidth="1.5"/></svg>
    ),
    Delete: (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" {...props}><path d="M17.0832 5H2.9165" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15.6946 7.08333L15.3113 12.8326C15.1638 15.045 15.09 16.1512 14.3692 16.8256C13.6483 17.5 12.5397 17.5 10.3223 17.5H9.67787C7.46054 17.5 6.35187 17.5 5.63103 16.8256C4.91019 16.1512 4.83644 15.045 4.68895 12.8326L4.30566 7.08333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7.9165 9.16667L8.33317 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12.0832 9.16667L11.6665 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ),
};

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Handle trouvé uniquement si "handle" exact (quoted), pas en sous-chaîne ex. "voila un msg test". */
function handleFoundInContent(content: string, handle: string): boolean {
    if (!handle || !content) return false;
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Liquid: linklists.handle, linklists['handle'] — handle entier
    const liquid =
        content.includes(`linklists.${handle}`) ||
        content.includes(`linklists['${handle}']`) ||
        content.includes(`linklists["${handle}"]`) ||
        new RegExp(`linklists\\.${esc(handle)}\\b`).test(content) ||
        new RegExp(`linklists\\s*\\[\\s*['"]${esc(handle)}['"]\\s*\\]`).test(content);
    if (liquid) return true;
    // JSON: "menu": "handle" — valeur exacte, pas substring
    const jsonKeys = ["menu", "menu_secondary", "menu_main", "menu_footer", "link_list"];
    for (const key of jsonKeys) {
        const re = new RegExp(`"${key}"\\s*:\\s*"${esc(handle)}"`, "i");
        if (re.test(content)) return true;
    }
    return false;
}


export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    
    const domain = (await admin.graphql(`{ shop { myshopifyDomain } }`).then((r: Response) => r.json())).data?.shop?.myshopifyDomain as string;
    if (!domain) return { menus: [], menusError: "Shop non trouvé.", storeSlug: "", mfCount: 0, moCount: 0, totalTemplates: 0, mediaCount: 0, menuCount: 0, reviewStatusMap: {} as Record<string, "to_review" | "reviewed"> };

    const activeThemeId = await getActiveThemeId(admin);
    
    // OPTIMISATION: Paralléliser toutes les requêtes indépendantes
    const [mfCount, moCount, mediaCount, menusResult, totalTemplates] = await Promise.all([
        getMetafieldCount(admin, domain),
        getMetaobjectCount(admin, domain),
        getMediaCount(admin, domain),
        // Récupérer les menus
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
                    const json = (await res.json()) as {
                        data?: { menus?: { pageInfo?: { hasNextPage?: boolean; endCursor?: string }; nodes?: { id: string; title: string; handle: string }[] } };
                        errors?: Array<{ message: string }>;
                    };
                    const gqlErrors = json.errors;
                    if (gqlErrors?.length) {
                        menusError = gqlErrors.map((e) => e.message).join(" ");
                        break;
                    }
                    const data = json.data?.menus;
                    if (!data?.nodes?.length) break;
                    menus = [...menus, ...data.nodes.map((n: { id: string; title: string; handle: string }) => ({ id: n.id, name: n.title || n.handle || "-", handle: n.handle || "" }))];
                    if (!data.pageInfo?.hasNextPage) break;
                    cursor = data.pageInfo.endCursor;
                    if (menus.length >= 500) break;
                }
            } catch (e) {
                menusError = e instanceof Error ? e.message : String(e);
            }
            return { menus, menusError };
        })(),
        // Compter les templates
        (async () => {
            if (!activeThemeId) return 0;
            const assetsRes = await fetch(
                `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
                { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
            );
            const assetsJson = await assetsRes.json();
            const allAssets = assetsJson.assets || [];
            const managedTypes = ["product", "collection", "page", "blog", "article"];
            return allAssets.filter((a: { key: string }) => {
                if (!a.key.startsWith("templates/") || !a.key.endsWith(".json")) return false;
                const t = a.key.replace("templates/", "").split(".")[0];
                return managedTypes.includes(t);
            }).length;
        })()
    ]);

    const { menus, menusError } = menusResult;

    // Le scan est géré par le ScanProvider, on retourne juste les menus sans inCode
    const menuData: MenuItem[] = menus.map((m) => ({
        ...m,
        inCode: false, // Sera mis à jour par le ScanProvider côté client
    }));

    let reviewStatusMap: Record<string, "to_review" | "reviewed"> = {};
    try {
        const rows = await db.itemReviewStatus.findMany({
            where: { shop: domain, source: "menus" },
            select: { itemId: true, status: true },
        });
        rows.forEach((r: { itemId: string; status: string }) => {
            reviewStatusMap[r.itemId] = r.status as "to_review" | "reviewed";
        });
    } catch {
        // table absente
    }

    const storeSlug = domain.replace(".myshopify.com", "");
    return {
        menus: menuData,
        menusError,
        domain,
        storeSlug,
        mfCount,
        moCount,
        totalTemplates,
        mediaCount,
        menuCount: menuData.length,
        reviewStatusMap,
    };
};

export const action = async ({ request }: { request: Request }) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");

    if (actionType === "set_review_status" || actionType === "clear_review_status") {
        try {
            const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
            const shopJson = await shopRes.json();
            const shop = shopJson.data?.shop?.myshopifyDomain;
            if (!shop) return { ok: false, errors: [{ message: "Shop non trouvé" }] };
            const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];
            if (!ids.length && actionType === "set_review_status") return { ok: false, errors: [{ message: "Aucun id" }] };
            if (actionType === "clear_review_status") {
                if (!ids.length) return { ok: false, errors: [{ message: "Aucun id" }] };
                await db.itemReviewStatus.deleteMany({ where: { shop, itemId: { in: ids }, source: "menus" } });
                return { ok: true, action: "clear_review_status" };
            }
            const status = (formData.get("status") as string) as "to_review" | "reviewed";
            if (!["to_review", "reviewed"].includes(status)) return { ok: false, errors: [{ message: "Statut invalide" }] };
            for (const itemId of ids) {
                await db.itemReviewStatus.upsert({
                    where: { shop_itemId_source: { shop, itemId, source: "menus" } },
                    create: { shop, itemId, status, source: "menus" },
                    update: { status },
                });
            }
            return { ok: true, action: "set_review_status" };
        } catch (e) {
            return { ok: false, errors: [{ message: "Base de données non prête." }] };
        }
    }

    if (actionType === "update") {
        const id = formData.get("id") as string;
        const title = (formData.get("title") as string) || "";
        const handle = (formData.get("handle") as string) || "";
        if (!id || !title.trim()) return { ok: false, errors: [{ message: "Id et titre requis" }] };
        try {
            const menuRes = await admin.graphql(
                `query getMenu($id: ID!) {
                    menu(id: $id) {
                        id title handle
                        items {
                            id title url resourceId type
                            items { id title url resourceId type items { id title url resourceId type } }
                        }
                    }
                }`,
                { variables: { id } }
            );
            const menuJson = await menuRes.json();
            const menu = menuJson.data?.menu;
            if (!menu) return { ok: false, errors: [{ message: "Menu introuvable" }] };

            function toInput(item: any): any {
                const it: any = { id: item.id, title: item.title || "", type: item.type || "FRONTPAGE", items: [] };
                if (item.url) it.url = item.url;
                if (item.resourceId) it.resourceId = item.resourceId;
                if (item.items?.length) it.items = item.items.map(toInput);
                return it;
            }
            const items = (menu.items || []).map(toInput);

            const updateRes = await admin.graphql(
                `mutation menuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
                    menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
                        menu { id }
                        userErrors { message }
                    }
                }`,
                { variables: { id, title: title.trim(), handle: handle.trim() || menu.handle, items } }
            );
            const updateJson = await updateRes.json();
            const errs = updateJson.data?.menuUpdate?.userErrors || [];
            if (errs.length) return { ok: false, errors: errs };
            return { ok: true, action: "update" };
        } catch (e) {
            return { ok: false, errors: [{ message: e instanceof Error ? e.message : "Erreur update" }] };
        }
    }

    return null;
};

export default function AppMenu() {
    const { menus, menusError, storeSlug, mfCount, moCount, totalTemplates, mediaCount, menuCount, reviewStatusMap } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const submit = useSubmit();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[] } | null>();
    const [search, setSearch] = useState("");
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<MenuItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editHandle, setEditHandle] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ single: MenuItem | null; ids: string[] }>({ single: null, ids: [] });
    const [toast, setToast] = useState<{ title: string; msg: string } | null>(null);
    
    // Utiliser le contexte de scan global
    const { isScanning, menuResults, startScan } = useScan();

    useEffect(() => {
        if (!actionData) return;
        if (actionData.ok && (actionData.action === "set_review_status" || actionData.action === "clear_review_status")) {
            setSelectedKeys(new Set());
            setToast({ title: "Statut mis à jour", msg: "Les lignes ont été marquées." });
            revalidator.revalidate();
        }
        if (actionData.ok && actionData.action === "update") {
            setEditModalOpen(false);
            setEditItem(null);
            setToast({ title: "Enregistré", msg: "Modification enregistrée." });
            revalidator.revalidate();
        }
        if (actionData.ok === false && actionData.errors?.length) {
            setToast({ title: "Erreur", msg: actionData.errors.map((e) => e.message).join(" ") });
        }
    }, [actionData, revalidator]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const filtered = useMemo(() => {
        if (!search?.trim()) return menus;
        const s = norm(search.trim());
        return menus.filter((m) => norm(m.name).includes(s) || norm(m.handle).includes(s));
    }, [menus, search]);

    const getMenuAdminUrl = (item: MenuItem) => {
        const menuId = item.id.split("/").pop();
        return `https://admin.shopify.com/store/${storeSlug || "admin"}/content/menus/${menuId}`;
    };

    const handleScanCode = () => {
        startScan();
    };

    const columns = [
        { key: "name", label: "NOM DU MENU", className: "mf-col--name" },
        { key: "handle", label: "HANDLE", className: "mf-col--key" },
        { key: "inCode", label: "DANS LE CODE (TEMPLATES)", className: "mf-col--code" },
        { key: "actions", label: "LIEN", className: "mf-col--actions" },
        { key: "menu", label: " ", className: "mf-col--menu" },
    ];

    const renderCell = (item: MenuItem, key: React.Key) => {
        switch (key) {
            case "name":
                return (
                    <div className="mf-cell mf-cell--multi">
                        <span className="mf-text--title">{item.name}</span>
                    </div>
                );
            case "handle":
                return (
                    <div className="mf-cell mf-cell--key">
                        <span className="mf-text--key text-[#18181B]">{item.handle || "—"}</span>
                    </div>
                );
            case "inCode": {
                const inCode = menuResults.has(item.handle);
                return (
                    <div className="mf-cell mf-cell--center mf-cell--badge">
                        <span className={`mf-badge--code ${inCode ? "mf-badge--found" : ""} ${!inCode ? "text-[#18181B]" : ""}`}>
                            {inCode ? "Oui" : "Non"}
                        </span>
                    </div>
                );
            }
            case "actions":
                return (
                    <div className="mf-cell mf-cell--center">
                        <a href={getMenuAdminUrl(item)} target="_blank" rel="noopener noreferrer" className="mf-action-link" title="Ouvrir dans l'admin">
                            <Icons.Link />
                        </a>
                    </div>
                );
            case "menu":
                return (
                    <div className="mf-cell mf-cell--center">
                        <Dropdown classNames={{ content: "mf-dropdown-content" }}>
                            <DropdownTrigger>
                                <Button isIconOnly variant="light" size="sm" className="min-w-unit-8 w-8 h-8">
                                    <Icons.VerticalDots />
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                aria-label="Actions"
                                onAction={(k) => {
                                    if (k === "edit") {
                                        setEditItem(item);
                                        setEditName(item.name);
                                        setEditHandle(item.handle);
                                        setEditModalOpen(true);
                                    }
                                    if (k === "delete") {
                                        setDeleteTarget({ single: item, ids: [item.id] });
                                        setDeleteModalOpen(true);
                                    }
                                }}
                            >
                                <DropdownItem key="edit" startContent={<Icons.Edit />} className="mf-dropdown-item">
                                    <span className="mf-dropdown-item__title">Editer</span>
                                </DropdownItem>
                                <DropdownItem key="delete" startContent={<Icons.Delete />} className="mf-dropdown-item mf-dropdown-item--delete">
                                    <span className="mf-dropdown-item__title">Supprimer</span>
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleSaveEdit = () => {
        if (!editItem) return;
        const fd = new FormData();
        fd.append("action", "update");
        fd.append("id", editItem.id);
        fd.append("title", editName);
        fd.append("handle", editHandle);
        submit(fd, { method: "post" });
    };

    const handleReview = (status: "to_review" | "reviewed") => {
        const ids = Array.from(selectedKeys);
        if (!ids.length) return;
        const fd = new FormData();
        fd.append("action", "set_review_status");
        fd.append("ids", JSON.stringify(ids));
        fd.append("status", status);
        submit(fd, { method: "post" });
    };

    const handleClearReview = () => {
        const ids = Array.from(selectedKeys);
        if (!ids.length) return;
        const fd = new FormData();
        fd.append("action", "clear_review_status");
        fd.append("ids", JSON.stringify(ids));
        submit(fd, { method: "post" });
    };

    const handleBulkDeleteClick = () => {
        setDeleteTarget({ single: null, ids: Array.from(selectedKeys) });
        setDeleteModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-white animate-in fade-in duration-500">
            <div className="mx-auto px-6 py-6 space-y-6" style={{ maxWidth: "1800px" }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]">
                    <AppBrand />
                    <BasilicButton
                        variant="flat"
                        className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]"
                        isLoading={isScanning}
                        onPress={handleScanCode}
                        icon={
                            isScanning ? null : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
                                </svg>
                            )
                        }
                    >
                        Scan code
                    </BasilicButton>
                </div>

                <div className="flex items-center justify-between w-full flex-wrap gap-4">
                    <NavigationTabs activePath="/app/menu" counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount }} />
                    <div style={{ width: "320px" }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher un menu…" />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#F4F4F5]/50 rounded-[32px] border-2 border-dashed border-[#E4E4E7] animate-in fade-in duration-300">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                            <Icons.Menu className="text-[#A1A1AA]" />
                        </div>
                        <div className="text-[17px] font-semibold text-[#18181B] mb-2">Aucun menu trouvé</div>
                        <div className="text-[14px] text-[#71717A] text-center max-w-lg space-y-2">
                            {menus.length === 0 && menusError ? (
                                <>
                                    <p className="font-medium text-[#E11D48]">{menusError}</p>
                                    <p>L&apos;app a besoin du scope <code className="px-1.5 py-0.5 bg-[#E4E4E7] rounded text-[13px]">read_online_store_navigation</code> pour lister les menus. Réautorisez l&apos;app (désinstallez puis réinstallez, ou via le tableau de bord partenaire) pour accorder ce droit.</p>
                                </>
                            ) : menus.length === 0 ? (
                                "Aucun menu de navigation ou scope read_online_store_navigation manquant. Réautorisez l'app pour accorder ce droit."
                            ) : (
                                "Aucun résultat pour ce filtre ou cette recherche."
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mf-section__header mf-section__header--open">
                            <div className="mf-section__title-group">
                                <span className="mf-section__icon"><Icons.Menu /></span>
                                <span className="mf-section__title">Menus</span>
                                <span className="mf-section__count">{filtered.length}</span>
                            </div>
                        </div>
                        <div className="mf-table__base animate-in fade-in zoom-in-95 duration-300">
                            <Table
                                aria-label="Menus"
                                removeWrapper
                                selectionMode="multiple"
                                selectionBehavior={"checkbox" as any}
                                selectedKeys={selectedKeys}
                                onSelectionChange={(k) => setSelectedKeys(k as Set<string>)}
                                className="mf-table mf-table--menus"
                                classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}
                            >
                                <TableHeader columns={columns}>
                                    {(c) => (
                                        <TableColumn key={c.key} align={c.key === "inCode" || c.key === "actions" || c.key === "menu" ? "center" : "start"} className={c.className}>
                                            {c.label}
                                        </TableColumn>
                                    )}
                                </TableHeader>
                                <TableBody items={filtered} emptyContent="Aucun menu.">
                                    {(item) => (
                                        <TableRow
                                            key={item.id}
                                            className={reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : reviewStatusMap?.[item.id] === "reviewed" ? "mf-table__row--reviewed" : undefined}
                                        >
                                            {(key) => <TableCell>{renderCell(item, key)}</TableCell>}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {selectedKeys.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-2xl ring-1 ring-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-[14px] font-medium text-white">{selectedKeys.size} sélectionnés</span>
                            <button onClick={() => setSelectedKeys(new Set())} className="text-[#A1A1AA] hover:text-white transition-colors" aria-label="Tout désélectionner">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><g opacity="0.8"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6023 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6023 5.39763 18.3333 10 18.3333Z" fill="#3F3F46"/><path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></g></svg>
                            </button>
                        </div>
                        <div className="h-6 w-[1px] bg-[#3F3F46]" />
                        <Button onPress={() => handleReview("to_review")} className="bg-[#71717A] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#52525B] transition-colors gap-2">À review</Button>
                        <Button onPress={() => handleReview("reviewed")} className="bg-[#3F3F46] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#27272A] transition-colors gap-2">Review</Button>
                        <Button onPress={handleClearReview} variant="flat" className="text-[#A1A1AA] font-medium px-4 h-[36px] rounded-full hover:bg-white/10 hover:text-white transition-colors">Réinitialiser</Button>
                        <div className="h-6 w-[1px] bg-[#3F3F46]" />
                        <Button onPress={handleBulkDeleteClick} className="bg-[#F43F5E] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#E11D48] transition-colors gap-2" startContent={<Icons.Delete />}>Supprimer</Button>
                    </div>
                </div>
            )}

            <BasilicModal
                isOpen={editModalOpen}
                onClose={() => { setEditModalOpen(false); setEditItem(null); }}
                title="Editer le menu"
                footer={
                    <>
                        <Button variant="light" onPress={() => { setEditModalOpen(false); setEditItem(null); }} className="grow bg-[#F4F4F5]">Annuler</Button>
                        <BasilicButton className="grow" onPress={handleSaveEdit}>Enregistrer</BasilicButton>
                    </>
                }
            >
                <div className="space-y-4 pt-2">
                    <div>
                        <label htmlFor="menu-name" className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5 block">Nom</label>
                        <input id="menu-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-11 px-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] font-semibold" />
                    </div>
                    <div>
                        <label htmlFor="menu-handle" className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5 block">Handle</label>
                        <input id="menu-handle" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} className="w-full h-11 px-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] font-mono" placeholder="main-menu" />
                        <p className="text-[12px] text-[#71717A] mt-1">Les menus par défaut (Main menu, Footer…) ont un handle protégé.</p>
                    </div>
                </div>
            </BasilicModal>

            <BasilicModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setDeleteTarget({ single: null, ids: [] }); }}
                title="Suppression de menus"
                footer={
                    <>
                        <Button variant="light" onPress={() => { setDeleteModalOpen(false); setDeleteTarget({ single: null, ids: [] }); }} className="grow bg-[#F4F4F5]">Fermer</Button>
                        <a
                            href={deleteTarget.single ? getMenuAdminUrl(deleteTarget.single) : `https://admin.shopify.com/store/${storeSlug}/content/menus`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex grow items-center justify-center gap-2 rounded-xl bg-[#4BB961] px-4 py-2.5 text-[14px] font-semibold text-white hover:opacity-90 transition-opacity"
                        >
                            Ouvrir l&apos;admin Shopify
                        </a>
                    </>
                }
            >
                <p className="py-2 text-sm text-[#71717A]">
                    La suppression de menus n&apos;est pas disponible via l&apos;API. Supprimez les menus depuis l&apos;admin Shopify (Contenu → Menus). Utilisez le bouton ci‑dessous pour y accéder.
                </p>
            </BasilicModal>

            {toast && (
                <div className="mf-toast">
                    <div className="mf-toast__content">
                        <span className="mf-toast__title">{toast.title}</span>
                        <span className="mf-toast__message">{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
