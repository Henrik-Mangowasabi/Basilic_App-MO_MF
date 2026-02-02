import { useState } from "react";

/**
 * Hook pour gérer la sélection multiple dans les tables
 *
 * Gère la sélection de lignes avec support de sélection "all" et fusion
 * des sélections entre différentes sections d'une même page.
 *
 * @example
 * ```tsx
 * const { selectedKeys, handleSelectionChange, clearSelection } = useTableSelection();
 *
 * <Table
 *     selectedKeys={selectedKeys}
 *     onSelectionChange={(keys) => handleSelectionChange(data, keys)}
 * >
 *     ...
 * </Table>
 *
 * // Nombre de sélectionnés
 * {selectedKeys.size}
 *
 * // Effacer la sélection
 * <button onClick={clearSelection}>Clear</button>
 * ```
 */
export function useTableSelection(initialKeys: Set<string> = new Set()) {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(initialKeys);

    /**
     * Gère le changement de sélection pour une section de table
     *
     * Supporte la sélection "all" et fusionne intelligemment avec les sélections
     * existantes d'autres sections pour permettre une sélection multi-sections.
     *
     * @param sectionData - Données de la section actuelle
     * @param keys - Nouvelles clés sélectionnées ("all" ou Set<string>)
     */
    const handleSelectionChange = <T extends { id?: string; key?: string }>(
        sectionData: T[],
        keys: Set<string> | "all"
    ) => {
        if (keys === "all") {
            // Sélectionner tous les items de cette section
            const newSet = new Set(selectedKeys);
            sectionData.forEach((d) => {
                const itemId = d.id || d.key;
                if (itemId) newSet.add(itemId);
            });
            setSelectedKeys(newSet);
        } else {
            // Fusionner avec les sélections existantes d'autres sections
            const currentTableIds = new Set(
                sectionData.map((d) => d.id || d.key).filter((id): id is string => !!id)
            );
            const otherIds = new Set(
                [...selectedKeys].filter((id) => !currentTableIds.has(id))
            );
            const final = new Set([...otherIds, ...keys]);
            setSelectedKeys(final);
        }
    };

    /**
     * Efface toute la sélection
     */
    const clearSelection = () => setSelectedKeys(new Set());

    return {
        selectedKeys,
        setSelectedKeys,
        handleSelectionChange,
        clearSelection
    };
}
