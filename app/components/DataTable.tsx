import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "./ui";

export interface Column {
    key: string;
    label: string;
    align?: "start" | "center" | "end";
    className?: string;
}

interface DataTableProps<T> {
    columns: Column[];
    data: T[];
    selectedKeys: Set<string>;
    onSelectionChange: (keys: Set<string> | "all") => void;
    renderCell: (item: T, columnKey: React.Key) => React.ReactNode;
    getRowClassName?: (item: T) => string | undefined;
    emptyContent?: string;
    ariaLabel: string;
}

/**
 * DataTable - Composant Table réutilisable avec sélection multiple
 *
 * Encapsule la logique de Table de HeroUI avec des props simplifiées.
 * Gère la sélection multiple, les colonnes personnalisables, et le rendu des cellules.
 *
 * @example
 * ```tsx
 * const columns = [
 *   { key: "name", label: "NOM", className: "w-[300px]" },
 *   { key: "count", label: "COUNT", align: "center" }
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={filteredData}
 *   selectedKeys={selectedKeys}
 *   onSelectionChange={(keys) => handleSelectionChange(filteredData, keys)}
 *   renderCell={renderCell}
 *   getRowClassName={(item) => reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : undefined}
 *   ariaLabel="Liste des templates"
 * />
 * ```
 */
export function DataTable<T extends { id?: string; key?: string }>({
    columns,
    data,
    selectedKeys,
    onSelectionChange,
    renderCell,
    getRowClassName,
    emptyContent = "Aucune donnée trouvée.",
    ariaLabel
}: DataTableProps<T>) {
    return (
        <div className="mf-table__base">
            <Table
                aria-label={ariaLabel}
                removeWrapper
                selectionMode="multiple"
                selectedKeys={selectedKeys}
                onSelectionChange={(keys) => onSelectionChange(keys as Set<string> | "all")}
                onRowAction={() => {}}
                className="mf-table mf-table--templates"
                classNames={{
                    th: "mf-table__header",
                    td: "mf-table__cell",
                    tr: "mf-table__row"
                }}
            >
                <TableHeader columns={columns}>
                    {(c) => (
                        <TableColumn
                            key={c.key}
                            align={c.align || "start"}
                            className={c.className}
                        >
                            {c.label}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody items={data} emptyContent={emptyContent}>
                    {(item: T) => {
                        const itemKey = item.id || item.key || "";
                        return (
                            <TableRow
                                key={itemKey}
                                className={getRowClassName?.(item)}
                            >
                                {(columnKey) => (
                                    <TableCell>
                                        {renderCell(item, columnKey)}
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    }}
                </TableBody>
            </Table>
        </div>
    );
}
