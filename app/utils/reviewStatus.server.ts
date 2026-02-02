import type { PrismaClient } from "@prisma/client";

export type ReviewStatus = "to_review" | "reviewed";
export type ReviewSource = "mf" | "mo" | "templates" | "sections" | "menus";

/**
 * Définit le statut de review pour un ou plusieurs items
 *
 * @param db - Instance Prisma Client
 * @param shop - Domain du shop (myshopifyDomain)
 * @param itemIds - Liste des IDs des items
 * @param status - Statut à appliquer ("to_review" ou "reviewed")
 * @param source - Source des items (mf, mo, templates, sections, menus)
 *
 * @example
 * ```typescript
 * await setReviewStatus(db, "myshop.myshopify.com", ["id1", "id2"], "to_review", "mf");
 * ```
 */
export async function setReviewStatus(
    db: PrismaClient,
    shop: string,
    itemIds: string[],
    status: ReviewStatus,
    source: ReviewSource
): Promise<void> {
    for (const itemId of itemIds) {
        await db.itemReviewStatus.upsert({
            where: { shop_itemId_source: { shop, itemId, source } },
            create: { shop, itemId, status, source },
            update: { status }
        });
    }
}

/**
 * Supprime le statut de review pour un ou plusieurs items
 *
 * @param db - Instance Prisma Client
 * @param shop - Domain du shop (myshopifyDomain)
 * @param itemIds - Liste des IDs des items
 * @param source - Source des items (mf, mo, templates, sections, menus)
 *
 * @example
 * ```typescript
 * await clearReviewStatus(db, "myshop.myshopify.com", ["id1", "id2"], "mf");
 * ```
 */
export async function clearReviewStatus(
    db: PrismaClient,
    shop: string,
    itemIds: string[],
    source: ReviewSource
): Promise<void> {
    await db.itemReviewStatus.deleteMany({
        where: {
            shop,
            itemId: { in: itemIds },
            source
        }
    });
}

/**
 * Récupère une map des statuts de review pour tous les items d'une source
 *
 * @param db - Instance Prisma Client
 * @param shop - Domain du shop (myshopifyDomain)
 * @param source - Source des items (mf, mo, templates, sections, menus)
 * @returns Map avec itemId comme clé et ReviewStatus comme valeur
 *
 * @example
 * ```typescript
 * const reviewStatusMap = await getReviewStatusMap(db, "myshop.myshopify.com", "mf");
 * // { "gid://shopify/Metafield/123": "to_review", ... }
 * ```
 */
export async function getReviewStatusMap(
    db: PrismaClient,
    shop: string,
    source: ReviewSource
): Promise<Record<string, ReviewStatus>> {
    try {
        const rows = await db.itemReviewStatus.findMany({
            where: { shop, source },
            select: { itemId: true, status: true }
        });

        return Object.fromEntries(
            rows.map((r: { itemId: string; status: string }) => [r.itemId, r.status as ReviewStatus])
        );
    } catch {
        return {};
    }
}
