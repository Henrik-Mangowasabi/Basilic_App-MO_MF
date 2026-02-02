import React from "react";

/**
 * Bibliothèque de renderers réutilisables pour les cellules de tables
 *
 * Ces renderers standardisent l'affichage des cellules à travers toutes les routes,
 * réduisent la duplication et assurent une cohérence visuelle.
 *
 * @example
 * ```tsx
 * // Dans renderCell:
 * case "name":
 *   return CellRenderers.nameCell(item.name, item.description);
 *
 * case "count":
 *   return CellRenderers.countCell(item.count, () => handleClick(item));
 * ```
 */
export const CellRenderers = {
    /**
     * Cellule avec titre et description optionnelle
     * Utilisée pour: Nom des metafields, métaobjets, templates, sections, menus
     */
    nameCell: (name: string, description?: string) => (
        <div className="mf-cell mf-cell--multi w-full mf-template-cell-no-select">
            <span className="mf-text--title">{name}</span>
            {description && <span className="mf-text--desc">{description}</span>}
        </div>
    ),

    /**
     * Cellule avec clé technique (namespace, handle, type)
     * Utilisée pour: Namespaces, handles, types techniques
     */
    keyCell: (key: string, className?: string) => (
        <div className="mf-cell mf-cell--key">
            <span className={`mf-text--key ${className || ""}`}>{key || "—"}</span>
        </div>
    ),

    /**
     * Cellule de compteur avec variants de couleur
     * Utilisée pour: Counts, assignments, references
     *
     * @param count - Nombre à afficher
     * @param onClick - Callback optionnel pour rendre le badge cliquable
     * @param variant - Style du badge (success: vert, danger: rouge, neutral: gris)
     */
    countCell: (
        count: number,
        onClick?: () => void,
        variant: "success" | "danger" | "neutral" = "neutral"
    ) => {
        const variantClass = {
            success: "cell-count--success",
            danger: "cell-count--danger",
            neutral: "cell-count--neutral"
        };

        return (
            <div className="mf-cell mf-cell--center cell-count">
                <span
                    className={`mf-badge--count ${variantClass[variant]} ${onClick ? "cursor-pointer" : ""}`}
                    onClick={onClick}
                    role={onClick ? "button" : undefined}
                    tabIndex={onClick ? 0 : undefined}
                    onKeyDown={onClick ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClick();
                        }
                    } : undefined}
                >
                    {count}
                </span>
            </div>
        );
    },

    /**
     * Cellule de badge (Oui/Non, status, etc.)
     * Utilisée pour: Indicateurs binaires, status
     */
    badgeCell: (
        isActive: boolean,
        activeLabel: string = "Oui",
        inactiveLabel: string = "Non"
    ) => (
        <div className="mf-cell mf-cell--center mf-cell--badge">
            <span className={`mf-badge--code ${isActive ? "mf-badge--found" : ""}`}>
                {isActive ? activeLabel : inactiveLabel}
            </span>
        </div>
    ),

    /**
     * Cellule de chip cliquable
     * Utilisée pour: Champs configurables, items multiples
     */
    chipCell: (
        label: string | number,
        onClick?: () => void,
        className?: string
    ) => (
        <div className="mf-cell mf-cell--type">
            <div
                className={`mf-chip ${onClick ? "cell-chip--clickable" : ""} ${className || ""}`}
                onClick={onClick}
                role={onClick ? "button" : undefined}
                tabIndex={onClick ? 0 : undefined}
                onKeyDown={onClick ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClick();
                    }
                } : undefined}
            >
                {label}
            </div>
        </div>
    ),

    /**
     * Cellule de date formatée
     * Utilisée pour: Dates de création, modification, etc.
     */
    dateCell: (date: string | Date) => {
        const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        return (
            <div className="mf-cell mf-cell--start">
                <span className="cell-date">{formattedDate}</span>
            </div>
        );
    },

    /**
     * Cellule wrapper pour les actions (liens, boutons)
     * Utilisée pour: Colonnes d'actions, liens externes
     */
    actionsCell: (children: React.ReactNode) => (
        <div className="mf-cell mf-cell--center">{children}</div>
    ),

    /**
     * Cellule de texte simple
     * Utilisée pour: Texte simple sans formatage spécial
     */
    textCell: (text: string | number, className?: string) => (
        <div className="mf-cell mf-cell--start">
            <span className={`cell-text ${className || ""}`}>{text}</span>
        </div>
    ),

    /**
     * Cellule vide avec placeholder
     * Utilisée pour: Valeurs manquantes, données non disponibles
     */
    emptyCell: (placeholder: string = "—") => (
        <div className="mf-cell mf-cell--center">
            <span className="cell-empty">{placeholder}</span>
        </div>
    )
};

/**
 * Type export pour faciliter l'utilisation
 */
export type CellRendererType = typeof CellRenderers;
