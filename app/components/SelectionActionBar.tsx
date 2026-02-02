import { Icons } from "./Icons";
import "../styles/basilic-ui.css";

interface SelectionActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onMarkToReview: () => void;
    onMarkReviewed: () => void;
    onClearReviewStatus: () => void;
    onDelete?: () => void;
    showDelete?: boolean;
}

/**
 * SelectionActionBar - Barre d'action flottante pour la sélection multiple
 *
 * Affiche une barre en bas de l'écran quand des éléments sont sélectionnés.
 * Permet de marquer les éléments comme "à review", "reviewed", ou de réinitialiser le statut.
 * Optionnellement, permet de supprimer les éléments (MF et MO uniquement).
 *
 * @example
 * ```tsx
 * <SelectionActionBar
 *   selectedCount={selectedKeys.size}
 *   onClearSelection={() => setSelectedKeys(new Set())}
 *   onMarkToReview={() => setReviewStatus(ids, "to_review")}
 *   onMarkReviewed={() => setReviewStatus(ids, "reviewed")}
 *   onClearReviewStatus={() => clearReviewStatus(ids)}
 * />
 * ```
 */
export function SelectionActionBar({
    selectedCount,
    onClearSelection,
    onMarkToReview,
    onMarkReviewed,
    onClearReviewStatus,
    onDelete,
    showDelete = false
}: SelectionActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="selection-action-bar">
            <div className="selection-action-bar__info">
                <span className="selection-action-bar__count">
                    {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                </span>
                <button
                    onClick={onClearSelection}
                    className="selection-action-bar__clear"
                    aria-label="Tout désélectionner"
                >
                    <Icons.Close />
                </button>
            </div>

            <div className="selection-action-bar__divider"></div>

            <button
                onClick={onMarkToReview}
                className="selection-action-bar__button"
            >
                À review
            </button>

            <button
                onClick={onMarkReviewed}
                className="selection-action-bar__button"
            >
                Review
            </button>

            <button
                onClick={onClearReviewStatus}
                className="selection-action-bar__button selection-action-bar__button--secondary"
            >
                Réinitialiser
            </button>

            {showDelete && onDelete && (
                <button
                    onClick={onDelete}
                    className="selection-action-bar__button selection-action-bar__button--danger"
                >
                    Supprimer
                </button>
            )}
        </div>
    );
}
