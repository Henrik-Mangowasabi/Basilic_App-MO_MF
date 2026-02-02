import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useLocation, useActionData } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import db from "../db.server";
import { getMetaobjectCount, getMetafieldCount, getMediaCount, getMenuCount, getTemplatesCount } from "../utils/graphql-helpers.server";
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

interface SectionItem {
    id: string;
    fileName: string;
    key: string;
    schemaName: string;
    assignmentCount: number;
    assignments: string[];
}

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const loader = async ({ request }: { request: Request }) => {
    const { admin, session } = await authenticate.admin(request);

    // 1. Theme Check
    const themesRes = await admin.graphql(`{ themes(first: 5, roles: [MAIN]) { nodes { id name } } }`);
    const themesJson = await themesRes.json();
    const activeTheme = themesJson.data?.themes?.nodes?.[0];

    if (!activeTheme) {
        const reviewStatusMapEarly = await getReviewStatusMap(db, session.shop, "sections");
        return { sections: [], moCount: 0, mfCount: 0, themeId: null, totalSections: 0, mediaCount: 0, menuCount: 0, shop: session.shop, reviewStatusMap: reviewStatusMapEarly };
    }

    const themeId = activeTheme.id.split('/').pop();

    // 2. Fetch Assets REST
    const assetsRes = await fetch(`https://${session.shop}/admin/api/${apiVersion}/themes/${themeId}/assets.json`, {
        headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
    });
    const assetsJson = await assetsRes.json();
    const assets = assetsJson.assets || [];

    // 3. Filtrer les sections (sections/*.liquid)
    const sectionAssets = assets.filter((a: { key: string }) => a.key.startsWith('sections/') && a.key.endsWith('.liquid'));

    // 4. Pour chaque section, récupérer le schemaName et compter les assignations
    const sections: SectionItem[] = [];

    // Récupérer tous les fichiers JSON en parallèle pour l'analyse des assignations
    const jsonAssets = assets.filter((a: { key: string }) =>
        (a.key.startsWith('templates/') || a.key.startsWith('sections/')) && a.key.endsWith('.json')
    );

    const batchSize = 10;

    // Récupérer les sections avec leur nom de schema
    for (let i = 0; i < sectionAssets.length; i += batchSize) {
        const batch = sectionAssets.slice(i, i + batchSize);

        await Promise.all(batch.map(async (asset: { key: string }) => {
            try {
                const url = `https://${session.shop}/admin/api/${apiVersion}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                const res = await fetch(url, {
                    headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                });

                if (!res.ok) return;

                const json = await res.json();
                const content = json.asset?.value || "";

                const fileName = asset.key.replace('sections/', '').replace('.liquid', '');
                let schemaName = fileName;

                // Extraire le nom du schema
                const schemaMatch = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/i);
                if (schemaMatch) {
                    try {
                        const schemaContent = schemaMatch[1];
                        const schemaJson = JSON.parse(schemaContent);
                        if (schemaJson.name) {
                            schemaName = schemaJson.name;
                        }
                    } catch (e) {
                        // Si le parsing échoue, on garde le nom du fichier
                    }
                }

                sections.push({
                    id: asset.key,
                    fileName,
                    key: asset.key,
                    schemaName,
                    assignmentCount: 0,
                    assignments: []
                });
            } catch (e) {
                // Ignorer les erreurs
            }
        }));
    }

    // Scanner les fichiers JSON pour trouver les assignations
    for (let i = 0; i < jsonAssets.length; i += batchSize) {
        const batch = jsonAssets.slice(i, i + batchSize);

        await Promise.all(batch.map(async (asset: { key: string }) => {
            try {
                const url = `https://${session.shop}/admin/api/${apiVersion}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`;
                const res = await fetch(url, {
                    headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                });

                if (!res.ok) return;

                const json = await res.json();
                const content = json.asset?.value || "";

                try {
                    const parsedJson = JSON.parse(content);

                    // Fonction récursive pour chercher toutes les occurrences de "type"
                    const findSectionTypes = (obj: any): Array<{ type: string, count: number }> => {
                        const typeMap = new Map<string, number>();

                        const traverse = (o: any) => {
                            if (typeof o === 'object' && o !== null) {
                                if (o.type && typeof o.type === 'string') {
                                    typeMap.set(o.type, (typeMap.get(o.type) || 0) + 1);
                                }

                                Object.values(o).forEach(value => {
                                    traverse(value);
                                });
                            }
                        };

                        traverse(obj);

                        return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
                    };

                    const foundTypes = findSectionTypes(parsedJson);

                    // Pour chaque type trouvé, l'associer à la section correspondante
                    foundTypes.forEach(({ type, count }) => {
                        const section = sections.find(s => s.fileName === type);
                        if (section) {
                            // Ajouter l'assignation avec le nombre d'occurrences
                            const assignmentKey = count > 1 ? `${asset.key} (${count}×)` : asset.key;
                            if (!section.assignments.includes(assignmentKey)) {
                                section.assignments.push(assignmentKey);
                                section.assignmentCount += count;
                            }
                        }
                    });
                } catch (e) {
                    // Ignorer les erreurs de parsing JSON
                }
            } catch (e) {
                // Ignorer les erreurs
            }
        }));
    }

    // Trier les sections par nom
    sections.sort((a, b) => a.schemaName.localeCompare(b.schemaName));

    // 5. Counts
    const shopDomain = session.shop;
    const [moCount, mfCount, mediaCount, menuCount, templatesCount] = await Promise.all([
        getMetaobjectCount(admin, shopDomain),
        getMetafieldCount(admin, shopDomain),
        getMediaCount(admin, shopDomain),
        getMenuCount(admin, shopDomain),
        getTemplatesCount(admin, shopDomain, session.accessToken!)
    ]);

    const reviewStatusMap = await getReviewStatusMap(db, shopDomain, "sections");

    return {
        sections,
        moCount,
        mfCount,
        totalSections: sections.length,
        templatesCount,
        themeId,
        mediaCount,
        menuCount,
        shop: session.shop,
        reviewStatusMap
    };
};

export const action = createRouteAction({
    source: "sections"
});

export default function AppSections() {
    const { sections, moCount, mfCount, totalSections, templatesCount, mediaCount, menuCount, shop, reviewStatusMap } = useLoaderData<typeof loader>();
    const location = useLocation();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[] } | null>();

    const { isScanning } = useScan();

    // ✨ Hooks custom pour simplifier la logique
    const { setReviewStatus, clearReviewStatus, revalidator } = useReviewStatus();
    const { selectedKeys, handleSelectionChange, clearSelection } = useTableSelection();

    const [search, setSearch] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Sections": true });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<SectionItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });

    const handleSort = (columnKey: string) => {
        setSortConfig(prev => {
            if (prev.column === columnKey) {
                return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                return { column: columnKey, direction: 'asc' };
            }
        });
    };

    const sortData = (data: SectionItem[]) => {
        if (!sortConfig.column) return data;

        const sorted = [...data].sort((a, b) => {
            let aVal: string = '';
            let bVal: string = '';

            switch (sortConfig.column) {
                case 'name':
                    aVal = (a.schemaName || '').toLowerCase();
                    bVal = (b.schemaName || '').toLowerCase();
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
    }, [actionData, clearSelection, revalidator]);

    // Filtrage par recherche
    const filteredData = useMemo(() => {
        if (!search?.trim()) return sections;
        const s = norm(search.trim());
        return sections.filter((item: SectionItem) =>
            norm(item.schemaName).includes(s) ||
            norm(item.fileName).includes(s) ||
            norm(item.key).includes(s)
        );
    }, [search, sections]);

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
                    <span>NOM DE LA SECTION</span>
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
        { key: "fileName", label: "NOM DU FICHIER", className: "mf-col--file" },
        { key: "assignmentCount", label: "ASSIGNATIONS", className: "mf-col--count" }
    ];

    const stopRowSelect = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

    const renderCell = (item: SectionItem, columnKey: React.Key) => {
        switch (columnKey) {
            case "name":
                return (
                    <div className="mf-cell mf-cell--multi mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                        <span className="mf-text--title">{item.schemaName}</span>
                        <span className="mf-text--desc">{item.key}</span>
                    </div>
                );
            case "fileName":
                return (
                    <div className="mf-cell mf-cell--start mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                        <span className="mf-text--key">{item.fileName}.liquid</span>
                    </div>
                );
            case "assignmentCount": {
                const isClickable = item.assignmentCount > 0;
                return (
                    <div className="mf-cell mf-cell--center mf-template-cell-no-select" onClick={stopRowSelect} onPointerDown={stopRowSelect} onPointerUp={stopRowSelect} onMouseDown={stopRowSelect} onMouseUp={stopRowSelect}>
                        <span
                            className={`mf-badge--count ${item.assignmentCount > 0 ? 'badge-success' : 'badge-neutral'} ${isClickable ? 'cursor-pointer hover-opacity transition-opacity' : ''}`}
                            onClick={isClickable ? (e: React.MouseEvent) => {
                                e.stopPropagation();
                                setModalData(item);
                                setModalOpen(true);
                            } : undefined}
                            role={isClickable ? "button" : undefined}
                            tabIndex={isClickable ? 0 : undefined}
                            onKeyDown={isClickable ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setModalData(item);
                                    setModalOpen(true);
                                }
                            } : undefined}
                        >
                            {item.assignmentCount} assignation{item.assignmentCount > 1 ? 's' : ''}
                        </span>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    const isOpen = openSections["Sections"];

    return (
        <div className="page">
            <div className="page-content page-content--wide space-y-6">
                <div className="page-header">
                    <AppBrand />
                    <BasilicButton
                        className="btn-secondary"
                        isLoading={isScanning}
                        onPress={() => revalidator.revalidate()}
                        icon={isScanning ? null : <Icons.Refresh />}
                    >
                        Actualiser
                    </BasilicButton>
                </div>

                <div className="page-nav-row">
                    <NavigationTabs activePath={location.pathname} counts={{ mf: mfCount, mo: moCount, t: templatesCount, m: mediaCount, menu: menuCount, sections: totalSections }} />
                    <div style={{ width: '320px' }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Rechercher une section..." />
                    </div>
                </div>

                {sections.length === 0 ? (
                    <div className="empty-state animate-in fade-in">
                        <div className="empty-state__title">Aucune section trouvée</div>
                        <div className="empty-state__description">Votre thème actif n&apos;a pas encore de fichiers sections. Les sections s&apos;afficheront ici une fois présentes dans le thème.</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="mf-section animate-in fade-in slide-in-from-bottom duration-500">
                            <div
                                className={`mf-section__header ${isOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`}
                                onClick={() => setOpenSections(p => ({ ...p, ["Sections"]: !p["Sections"] }))}
                            >
                                <div className="mf-section__title-group">
                                    <span className="mf-section__icon"><Icons.Section /></span>
                                    <span className="mf-section__title">Sections</span>
                                    <span className="mf-section__count">{filteredData.length}</span>
                                </div>
                                <span className={`mf-section__chevron ${isOpen ? 'mf-section__chevron--open' : ''}`}>
                                    <Icons.ChevronRight />
                                </span>
                            </div>
                            {isOpen && (
                                <div className="mf-table__base">
                                    <Table
                                        aria-label="Liste des sections"
                                        removeWrapper
                                        selectionMode="multiple"
                                        selectionBehavior="checkbox"
                                        onRowAction={() => {}}
                                        selectedKeys={new Set([...selectedKeys].filter((k) => filteredData.some((d: SectionItem) => d.key === k)))}
                                        onSelectionChange={(keys) => handleSelectionChange(filteredData, keys as Set<string> | "all")}
                                        className="mf-table mf-table--sections"
                                        classNames={{ th: "mf-table__header", td: "mf-table__cell", tr: "mf-table__row" }}
                                    >
                                        <TableHeader>
                                            {columns.map((c: any) => (
                                                <TableColumn
                                                    key={c.key}
                                                    align={c.key === "assignmentCount" ? "center" : "start"}
                                                    className={c.className}
                                                >
                                                    {c.label}
                                                </TableColumn>
                                            ))}
                                        </TableHeader>
                                        <TableBody items={sortData(filteredData)} emptyContent="Aucune section trouvée.">
                                            {(item: SectionItem) => (
                                                <TableRow
                                                    key={item.key}
                                                    rowKey={item.key}
                                                    className={
                                                        reviewStatusMap?.[item.key] === "to_review"
                                                            ? "mf-table__row--to-review"
                                                            : reviewStatusMap?.[item.key] === "reviewed"
                                                            ? "mf-table__row--reviewed"
                                                            : undefined
                                                    }
                                                >
                                                    {columns.map((c: any) => (
                                                        <TableCell key={c.key}>{renderCell(item, c.key)}</TableCell>
                                                    ))}
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
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
                                    {modalData?.schemaName}
                                </div>
                                <div className="modal-subtitle">
                                    Fichiers utilisant cette section
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                {modalData && (
                                    <div className="space-y-4">
                                        {modalData.assignments.length > 0 ? (
                                            <div className="space-y-2">
                                                {modalData.assignments.map((assignment, index) => {
                                                    // Extraire le nom du fichier et le nombre d'occurrences
                                                    const match = assignment.match(/^(.+?)\s*\((\d+)×\)$/);
                                                    const fileName = match ? match[1] : assignment;
                                                    const occurrences = match ? parseInt(match[2]) : 1;

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="resource-card resource-card--active"
                                                        >
                                                            <div className="resource-card__content">
                                                                <div className="resource-card__title">
                                                                    {fileName}
                                                                </div>
                                                                {occurrences > 1 && (
                                                                    <div className="resource-card__meta">
                                                                        Utilisé {occurrences} fois dans ce fichier
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="resource-card__actions">
                                                                <span className="resource-card__badge resource-card__badge--active">
                                                                    {fileName.startsWith('templates/') ? 'TEMPLATE' : 'SECTION'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="modal-empty">
                                                Aucune assignation trouvée
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button
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
