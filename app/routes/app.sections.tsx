import { useState, useEffect, useMemo } from "react";
import { useLoaderData, useLocation, useActionData } from "react-router";
import { authenticate, apiVersion } from "../shopify.server";
import db from "../db.server";
import { getMetaobjectCount, getMetafieldCount, getMediaCount, getMenuCount, getTemplatesCount, getSectionsCount, getActiveThemeId } from "../utils/graphql-helpers.server";
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
    const shopDomain = session.shop;

    // OPTIMISATION: Simplement récupérer l'ID du thème et les counts
    const [themeId, moCount, mfCount, mediaCount, menuCount, templatesCount, sectionsCount, reviewStatusMap] = await Promise.all([
        getActiveThemeId(admin),
        getMetaobjectCount(admin, shopDomain),
        getMetafieldCount(admin, shopDomain),
        getMediaCount(admin, shopDomain),
        getMenuCount(admin, shopDomain),
        getTemplatesCount(admin, shopDomain, session.accessToken!),
        getSectionsCount(admin, shopDomain, session.accessToken!),
        getReviewStatusMap(db, shopDomain, "sections")
    ]);

    return {
        moCount,
        mfCount,
        templatesCount,
        sectionsCount,
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
    const { moCount, mfCount, templatesCount, sectionsCount, mediaCount, menuCount, shop, reviewStatusMap } = useLoaderData<typeof loader>();
    const location = useLocation();
    const actionData = useActionData<{ ok: boolean; action?: string; errors?: { message: string }[] } | null>();

    const { isScanning, sectionResults, startScan } = useScan();

    // ✨ Hooks custom pour simplifier la logique
    const { setReviewStatus, clearReviewStatus, revalidator } = useReviewStatus();
    const { selectedKeys, handleSelectionChange, clearSelection } = useTableSelection();

    const [search, setSearch] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Sections": true });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<SectionItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });

    // Utiliser les résultats du scan
    const sections = sectionResults as unknown as SectionItem[];

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
            let aVal: any = '';
            let bVal: any = '';

            switch (sortConfig.column) {
                case 'name':
                    aVal = (a.schemaName || '').toLowerCase();
                    bVal = (b.schemaName || '').toLowerCase();
                    break;
                case 'count':
                    aVal = a.assignmentCount || 0;
                    bVal = b.assignmentCount || 0;
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
                        variant="flat"
                        className="btn-secondary"
                        isLoading={isScanning}
                        onPress={() => {
                            clearSelection();
                            startScan();
                        }}
                        icon={isScanning ? null : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 16H8v5"/></svg>}
                    >
                        Scan Code
                    </BasilicButton>
                </div>

                <div className="page-nav-row">
                    <NavigationTabs activePath={location.pathname} counts={{ mf: mfCount, mo: moCount, t: templatesCount, m: mediaCount, menu: menuCount, sections: sectionsCount }} />
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
                size="lg"
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
                            <ModalBody className="p-0">
                                {modalData && (
                                    <div className="mf-assignments-modal__wrap">
                                        <div className="mf-assignments-modal__header">
                                            <div className="mf-assignments-modal__subtitle-row">
                                                <span className="mf-assignments-modal__subtitle">Assignations</span>
                                                <span className="mf-assignments-modal__count-pill">
                                                    {modalData.assignments.length}
                                                </span>
                                            </div>
                                        </div>
                                        {modalData.assignments.length > 0 ? (
                                            <div className="mf-assignments-modal__list">
                                                {modalData.assignments.map((assignment, index) => (
                                                    <div key={index} className="mf-assignments-modal__card">
                                                        <div className="mf-assignments-modal__card-body">
                                                            <div className="mf-assignments-modal__card-name">
                                                                {assignment}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mf-assignments-modal__empty">Aucune assignation trouvée.</p>
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
