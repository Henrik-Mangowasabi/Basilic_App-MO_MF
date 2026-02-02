import { authenticate } from "../shopify.server";
import db from "../db.server";
import { setReviewStatus, clearReviewStatus, type ReviewSource } from "./reviewStatus.server";

/**
 * Type pour les handlers custom d'actions
 *
 * @param formData - FormData de la requête
 * @param admin - Instance Admin API Shopify
 * @param shop - Domain du shop (myshopifyDomain)
 * @returns Résultat de l'action
 */
export type ActionHandler = (
    formData: FormData,
    admin: any,
    shop: string
) => Promise<{ ok: boolean; action?: string; errors?: { message: string }[] }>;

/**
 * Configuration pour créer un action handler de route
 */
export interface RouteActionConfig {
    /** Source des items pour le review status (mf, mo, templates, sections, menus) */
    source: ReviewSource;
    /** Handlers custom pour les actions spécifiques (update, delete, etc.) */
    handlers?: Record<string, ActionHandler>;
}

/**
 * Factory qui crée un action handler standardisé pour une route
 *
 * Gère automatiquement les actions communes:
 * - `set_review_status`: Définir le statut de review
 * - `clear_review_status`: Supprimer le statut de review
 *
 * Les handlers custom peuvent être ajoutés via la config pour gérer
 * les actions spécifiques à chaque route (update, delete, etc.)
 *
 * @param config - Configuration de l'action handler
 * @returns Action handler prêt à être exporté dans une route
 *
 * @example
 * ```typescript
 * // Route avec seulement les actions communes (sections, templates, menus)
 * export const action = createRouteAction({
 *     source: "sections"
 * });
 *
 * // Route avec handlers custom (mf, mo)
 * export const action = createRouteAction({
 *     source: "mf",
 *     handlers: {
 *         update: async (formData, admin, shop) => {
 *             const id = formData.get("id") as string;
 *             const name = formData.get("name") as string;
 *             // ... logique de mise à jour
 *             return { ok: true, action: "update" };
 *         },
 *         delete: async (formData, admin, shop) => {
 *             const id = formData.get("id") as string;
 *             // ... logique de suppression
 *             return { ok: true, action: "delete" };
 *         }
 *     }
 * });
 * ```
 */
export function createRouteAction(config: RouteActionConfig) {
    return async ({ request }: { request: Request }) => {
        const { admin } = await authenticate.admin(request);
        const formData = await request.formData();
        const actionType = formData.get("action") as string;

        // Récupérer le shop domain
        const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
        const shopJson = await shopRes.json();
        const shop = shopJson.data?.shop?.myshopifyDomain;

        if (!shop) {
            return { ok: false, errors: [{ message: "Shop non trouvé" }] };
        }

        try {
            // ✨ Action commune: set_review_status
            if (actionType === "set_review_status") {
                const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];
                const status = formData.get("status") as "to_review" | "reviewed";

                if (!ids.length || !["to_review", "reviewed"].includes(status)) {
                    return { ok: false, errors: [{ message: "Paramètres invalides" }] };
                }

                await setReviewStatus(db, shop, ids, status, config.source);
                return { ok: true, action: "set_review_status" };
            }

            // ✨ Action commune: clear_review_status
            if (actionType === "clear_review_status") {
                const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];

                if (!ids.length) {
                    return { ok: false, errors: [{ message: "Aucun id fourni" }] };
                }

                await clearReviewStatus(db, shop, ids, config.source);
                return { ok: true, action: "clear_review_status" };
            }

            // ✨ Actions custom (update, delete, etc.)
            if (config.handlers?.[actionType]) {
                return await config.handlers[actionType]!(formData, admin, shop);
            }

            // Action non reconnue
            return { ok: false, errors: [{ message: `Action inconnue: ${actionType}` }] };
        } catch (e) {
            console.error("Error in route action:", e);
            return {
                ok: false,
                errors: [{ message: "Erreur serveur. Vérifiez que la base de données est disponible." }]
            };
        }
    };
}
