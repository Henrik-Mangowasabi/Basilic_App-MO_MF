import { useState, useMemo } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import { getMetafieldCount, getMetaobjectCount, getMediaCount, getActiveThemeId } from "../utils/graphql-helpers.server";
import "../styles/metafields-table.css";
import { AppBrand, BasilicSearch, NavigationTabs, BasilicButton } from "../components/BasilicUI";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Select, SelectItem } from "@heroui/react";

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
};

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function handleFoundInContent(content: string, handle: string): boolean {
    if (!handle || !content) return false;
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (
        content.includes(`linklists.${handle}`) ||
        content.includes(`linklists['${handle}']`) ||
        content.includes(`linklists["${handle}"]`) ||
        new RegExp(`linklists\\.${esc(handle)}\\b`).test(content) ||
        new RegExp(`linklists\\s*\\[\\s*['"]${esc(handle)}['"]\\s*\\]`).test(content)
    );
}

export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);
    const domain = (await admin.graphql(`{ shop { myshopifyDomain } }`).then((r: Response) => r.json())).data?.shop?.myshopifyDomain as string;
    if (!domain) return { menus: [], menusError: "Shop non trouvé.", storeSlug: "", mfCount: 0, moCount: 0, totalTemplates: 0, mediaCount: 0, menuCount: 0 };

    const activeThemeId = await getActiveThemeId(admin);
    const [mfCount, moCount, mediaCount] = await Promise.all([
        getMetafieldCount(admin, domain),
        getMetaobjectCount(admin, domain),
        getMediaCount(admin, domain),
    ]);

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

    let totalTemplates = 0;
    const handlesInCode = new Set<string>();

    if (activeThemeId) {
        const assetsRes = await fetch(
            `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`,
            { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
        );
        const assetsJson = await assetsRes.json();
        const allAssets = assetsJson.assets || [];
        const managedTypes = ["product", "collection", "page", "blog", "article"];
        totalTemplates = allAssets.filter((a: { key: string }) => {
            if (!a.key.startsWith("templates/") || !a.key.endsWith(".json")) return false;
            const t = a.key.replace("templates/", "").split(".")[0];
            return managedTypes.includes(t);
        }).length;

        const exts = [".liquid", ".json", ".js", ".css", ".scss", ".ts", ".tsx", ".jsx"];
        const scannable = allAssets.filter(
            (a: { key: string }) =>
                exts.some((e) => a.key.endsWith(e)) &&
                !a.key.includes("node_modules") &&
                !a.key.includes(".min.")
        );
        const batchSize = 20;
        for (let i = 0; i < scannable.length; i += batchSize) {
            const batch = scannable.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async (asset: { key: string }) => {
                    try {
                        const contentRes = await fetch(
                            `https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`,
                            { headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" } }
                        );
                        const contentJson = await contentRes.json();
                        const content = contentJson.asset?.value || "";
                        menus.forEach((m) => {
                            if (handleFoundInContent(content, m.handle)) handlesInCode.add(m.handle);
                        });
                    } catch {
                        // ignore
                    }
                })
            );
        }
    }

    const menuData: MenuItem[] = menus.map((m) => ({
        ...m,
        inCode: handlesInCode.has(m.handle),
    }));

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
    };
};

export default function AppMenu() {
    const { menus, menusError, storeSlug, mfCount, moCount, totalTemplates, mediaCount, menuCount } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();
    const [search, setSearch] = useState("");
    const [dropdownFilter, setDropdownFilter] = useState<string>("all");
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        let list = menus;
        if (dropdownFilter !== "all") {
            const k = dropdownFilter;
            list = list.filter((m) => (m.handle || m.id) === k);
        }
        if (!search?.trim()) return list;
        const s = norm(search.trim());
        return list.filter((m) => norm(m.name).includes(s) || norm(m.handle).includes(s));
    }, [menus, dropdownFilter, search]);

    const columns = [
        { key: "name", label: "NOM DU MENU", className: "mf-col--name" },
        { key: "handle", label: "HANDLE", className: "mf-col--key" },
        { key: "inCode", label: "DANS LE CODE (TEMPLATES)", className: "mf-col--code" },
        { key: "actions", label: "LIEN", className: "mf-col--actions" },
        { key: "menu", label: " ", className: "mf-col--menu" },
    ];

    const getMenuAdminUrl = () => `https://admin.shopify.com/store/${storeSlug || "admin"}/menus`;

    const renderCell = (item: MenuItem, key: React.Key) => {
        switch (key) {
            case "name":
                return (
                    <div className="mf-cell mf-cell--multi">
                        <span className="mf-text--title">{item.name}</span>
                        <span className="mf-text--desc">Handle: {item.handle || "—"}</span>
                    </div>
                );
            case "handle":
                return (
                    <div className="mf-cell mf-cell--key">
                        <span className="mf-text--key">{item.handle || "—"}</span>
                    </div>
                );
            case "inCode":
                return (
                    <div className="mf-cell mf-cell--center mf-cell--badge">
                        <span className={`mf-badge--code ${item.inCode ? "mf-badge--found" : ""}`}>
                            {item.inCode ? "Oui" : "Non"}
                        </span>
                    </div>
                );
            case "actions":
                return (
                    <div className="mf-cell mf-cell--center">
                        <a href={getMenuAdminUrl()} target="_blank" rel="noopener noreferrer" className="mf-action-link" title="Ouvrir dans l’admin">
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
                            <DropdownMenu aria-label="Actions" onAction={() => window.open(getMenuAdminUrl(), "_blank")}>
                                <DropdownItem key="open" startContent={<Icons.Link />} className="mf-dropdown-item">
                                    <span className="mf-dropdown-item__title">Ouvrir dans Shopify</span>
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-white animate-in fade-in duration-500">
            <div className="mx-auto px-6 py-6 space-y-6" style={{ maxWidth: "1800px" }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]">
                    <AppBrand />
                    <BasilicButton
                        variant="flat"
                        className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]"
                        isLoading={revalidator.state === "loading"}
                        onPress={() => revalidator.revalidate()}
                        icon={
                            revalidator.state === "loading" ? null : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
                                </svg>
                            )
                        }
                    >
                        Actualiser / Scan code
                    </BasilicButton>
                </div>

                <div className="flex items-center justify-between w-full flex-wrap gap-4">
                    <NavigationTabs activePath="/app/menu" counts={{ mf: mfCount, mo: moCount, t: totalTemplates, m: mediaCount, menu: menuCount }} />
                    <div className="flex items-center gap-3 flex-wrap">
                        <Select
                            aria-label="Filtrer par menu"
                            placeholder="Tous les menus"
                            selectedKeys={dropdownFilter === "all" ? ["all"] : [dropdownFilter]}
                            onSelectionChange={(keys) => {
                                const v = Array.from(keys as Set<string>)[0] as string;
                                setDropdownFilter(v ?? "all");
                            }}
                            className="w-[220px]"
                            size="sm"
                            classNames={{ trigger: "min-h-[40px]" }}
                            items={[{ key: "all", label: "Tous les menus" }, ...menus.map((m) => ({ key: m.handle || m.id, label: m.name }))]}
                        >
                            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                        </Select>
                        <div style={{ width: "320px" }}>
                            <BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher un menu…" />
                        </div>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#F4F4F5]/50 rounded-[32px] border-2 border-dashed border-[#E4E4E7] animate-in fade-in duration-300">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                            <Icons.Menu className="text-[#A1A1AA]" />
                        </div>
                        <div className="text-[17px] font-semibold text-[#18181B] mb-2">Aucun menu trouvé</div>
                        <div className="text-[14px] text-[#71717A] text-center max-w-lg space-y-2">
                            {menus.length === 0
                                ? (menusError ? (
                                    <>
                                        <p className="font-medium text-[#E11D48]">{menusError}</p>
                                        <p>L&apos;app a besoin du scope <code className="px-1.5 py-0.5 bg-[#E4E4E7] rounded text-[13px]">read_online_store_navigation</code> pour lister les menus. Réautorisez l&apos;app (désinstallez puis réinstallez, ou via le tableau de bord partenaire) pour accorder ce droit.</p>
                                    </>
                                ) : "Aucun menu de navigation ou scope read_online_store_navigation manquant. Réautorisez l\u2019app pour accorder ce droit.")
                                : "Aucun résultat pour ce filtre ou cette recherche."}
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
                                className="mf-table"
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
                                        <TableRow key={item.id}>
                                            {(key) => <TableCell>{renderCell(item, key)}</TableCell>}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
