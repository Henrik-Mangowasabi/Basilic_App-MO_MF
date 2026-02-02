import { useState, useMemo } from "react";

/**
 * Normalise une chaîne de caractères pour la recherche
 * - Enlève les accents
 * - Met en minuscules
 * - Gère les valeurs null/undefined
 */
const normalize = (s: string | null | undefined): string =>
    (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Hook pour gérer la recherche normalisée avec filtrage
 *
 * Normalise automatiquement les accents et la casse pour une recherche
 * insensible aux accents et à la casse.
 *
 * @example
 * ```tsx
 * const { search, setSearch, filteredItems } = useNormSearch(
 *     items,
 *     (item) => [item.name, item.description]
 * );
 *
 * <BasilicSearch value={search} onValueChange={setSearch} />
 *
 * {filteredItems.map(item => <div>{item.name}</div>)}
 * ```
 */
export function useNormSearch<T>(
    items: T[],
    searchFields: (item: T) => (string | null | undefined)[]
) {
    const [search, setSearch] = useState("");

    /**
     * Items filtrés selon le terme de recherche
     * Memoized pour optimiser les performances
     */
    const filteredItems = useMemo(() => {
        if (!search?.trim()) return items;

        const searchTerm = normalize(search.trim());

        return items.filter((item) =>
            searchFields(item).some((field) =>
                normalize(field).includes(searchTerm)
            )
        );
    }, [search, items, searchFields]);

    return {
        search,
        setSearch,
        filteredItems
    };
}

/**
 * Export de la fonction normalize pour usage externe si besoin
 */
export { normalize };
