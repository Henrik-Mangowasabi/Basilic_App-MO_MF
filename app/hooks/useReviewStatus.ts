import { useSubmit, useRevalidator } from "react-router";

/**
 * Hook pour gérer le statut de review des items
 *
 * Fournit des fonctions simplifiées pour marquer des items comme "à review" ou "reviewed",
 * ainsi que pour réinitialiser leur statut.
 *
 * @example
 * ```tsx
 * const { setReviewStatus, clearReviewStatus } = useReviewStatus();
 *
 * // Marquer comme "à review"
 * setReviewStatus(["id1", "id2"], "to_review");
 *
 * // Marquer comme "reviewed"
 * setReviewStatus(["id1", "id2"], "reviewed");
 *
 * // Réinitialiser le statut
 * clearReviewStatus(["id1", "id2"]);
 * ```
 */
export function useReviewStatus() {
    const submit = useSubmit();
    const revalidator = useRevalidator();

    /**
     * Marque des items avec un statut de review
     * @param ids - Liste des IDs à marquer
     * @param status - Statut à appliquer ("to_review" | "reviewed")
     */
    const setReviewStatus = (ids: string[], status: "to_review" | "reviewed") => {
        const formData = new FormData();
        formData.append("action", "set_review_status");
        formData.append("ids", JSON.stringify(ids));
        formData.append("status", status);
        submit(formData, { method: "post" });
    };

    /**
     * Réinitialise le statut de review des items
     * @param ids - Liste des IDs à réinitialiser
     */
    const clearReviewStatus = (ids: string[]) => {
        const formData = new FormData();
        formData.append("action", "clear_review_status");
        formData.append("ids", JSON.stringify(ids));
        submit(formData, { method: "post" });
    };

    return {
        setReviewStatus,
        clearReviewStatus,
        revalidator
    };
}
