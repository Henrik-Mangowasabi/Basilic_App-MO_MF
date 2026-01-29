import db from "../db.server";

// Durée de validité du cache en minutes
const CACHE_TTL_MINUTES = 5;

export type CacheKey = 'mfCount' | 'moCount' | 'mediaCount' | 'templatesCount' | 'menuCount';

/**
 * Récupère une valeur du cache si elle existe et n'est pas expirée
 */
export async function getFromCache(shop: string, cacheKey: CacheKey): Promise<number | null> {
    try {
        const cached = await db.countCache.findUnique({
            where: { shop_cacheKey: { shop, cacheKey } }
        });
        
        if (!cached) return null;
        
        // Vérifier si le cache est encore valide
        const now = new Date();
        const cacheAge = (now.getTime() - cached.updatedAt.getTime()) / 1000 / 60; // en minutes
        
        if (cacheAge > CACHE_TTL_MINUTES) {
            return null; // Cache expiré
        }
        
        return cached.value;
    } catch {
        // Table pas encore créée ou erreur
        return null;
    }
}

/**
 * Stocke une valeur dans le cache
 */
export async function setInCache(shop: string, cacheKey: CacheKey, value: number): Promise<void> {
    try {
        await db.countCache.upsert({
            where: { shop_cacheKey: { shop, cacheKey } },
            create: { shop, cacheKey, value },
            update: { value, updatedAt: new Date() }
        });
    } catch {
        // Ignorer les erreurs de cache (non critique)
    }
}

/**
 * Invalide une entrée du cache
 */
export async function invalidateCache(shop: string, cacheKey?: CacheKey): Promise<void> {
    try {
        if (cacheKey) {
            await db.countCache.delete({
                where: { shop_cacheKey: { shop, cacheKey } }
            });
        } else {
            // Invalider tout le cache pour ce shop
            await db.countCache.deleteMany({ where: { shop } });
        }
    } catch {
        // Ignorer
    }
}

/**
 * Récupère plusieurs valeurs du cache en une seule requête
 */
export async function getMultipleFromCache(shop: string, keys: CacheKey[]): Promise<Record<CacheKey, number | null>> {
    const result: Record<string, number | null> = {};
    keys.forEach(k => result[k] = null);
    
    try {
        const cached = await db.countCache.findMany({
            where: { shop, cacheKey: { in: keys } }
        });
        
        const now = new Date();
        for (const item of cached) {
            const cacheAge = (now.getTime() - item.updatedAt.getTime()) / 1000 / 60;
            if (cacheAge <= CACHE_TTL_MINUTES) {
                result[item.cacheKey] = item.value;
            }
        }
    } catch {
        // Ignorer
    }
    
    return result as Record<CacheKey, number | null>;
}
