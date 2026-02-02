import { getFromCache, setInCache, getMultipleFromCache, type CacheKey } from "./cache.server";

type AdminGraphQL = {
    graphql: (query: string, options?: { variables?: Record<string, any> }) => Promise<Response>;
};

/**
 * Compte les metaobject definitions avec cache
 */
export async function getMetaobjectCount(admin: AdminGraphQL, shop: string, useCache = true): Promise<number> {
    if (useCache) {
        const cached = await getFromCache(shop, 'moCount');
        if (cached !== null) return cached;
    }
    
    let moCount = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    
    while (hasNextPage) {
        const res = await admin.graphql(
            `query getMetaobjectDefinitionsCount($cursor: String) { 
                metaobjectDefinitions(first: 250, after: $cursor) { 
                    pageInfo { hasNextPage endCursor } 
                    nodes { id } 
                } 
            }`,
            { variables: { cursor } }
        );
        const json: any = await res.json();
        const data = json.data?.metaobjectDefinitions;
        
        if (data?.nodes?.length) {
            moCount += data.nodes.length;
        }
        hasNextPage = data?.pageInfo?.hasNextPage || false;
        cursor = data?.pageInfo?.endCursor || null;
        if (moCount >= 10000) break;
    }
    
    if (useCache) {
        await setInCache(shop, 'moCount', moCount);
    }
    
    return moCount;
}

/**
 * Compte les metafield definitions avec cache (toutes les ressources)
 */
export async function getMetafieldCount(admin: AdminGraphQL, shop: string, useCache = true): Promise<number> {
    if (useCache) {
        const cached = await getFromCache(shop, 'mfCount');
        if (cached !== null) return cached;
    }
    
    const ownerTypes = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    
    // Paralléliser les requêtes pour chaque type
    const counts = await Promise.all(ownerTypes.map(async (ownerType) => {
        let count = 0;
        let hasNextPage = true;
        let cursor: string | null = null;
        
        while (hasNextPage) {
            const res = await admin.graphql(
                `query getMetafieldDefinitionsCount($cursor: String, $ownerType: MetafieldOwnerType!) { 
                    metafieldDefinitions(ownerType: $ownerType, first: 250, after: $cursor) { 
                        pageInfo { hasNextPage endCursor } 
                        nodes { id } 
                    } 
                }`,
                { variables: { cursor, ownerType } }
            );
            const json = await res.json();
            const data = json.data?.metafieldDefinitions;
            
            if (data?.nodes?.length) {
                count += data.nodes.length;
            }
            hasNextPage = data?.pageInfo?.hasNextPage || false;
            cursor = data?.pageInfo?.endCursor || null;
            if (count >= 10000) break;
        }
        return count;
    }));
    
    const totalCount = counts.reduce((a, b) => a + b, 0);
    
    if (useCache) {
        await setInCache(shop, 'mfCount', totalCount);
    }
    
    return totalCount;
}

/**
 * Compte les fichiers média avec cache
 */
export async function getMediaCount(admin: AdminGraphQL, shop: string, useCache = true): Promise<number> {
    if (useCache) {
        const cached = await getFromCache(shop, 'mediaCount');
        if (cached !== null) return cached;
    }
    
    let mediaCount = 0;
    let hasNextPage = true;
    let cursor: string | null = null;
    
    while (hasNextPage) {
        const res = await admin.graphql(
            `query getFilesCount($cursor: String) { 
                files(first: 250, after: $cursor) { 
                    pageInfo { hasNextPage endCursor } 
                    nodes { id } 
                } 
            }`,
            { variables: { cursor } }
        );
        const json: any = await res.json();
        const data = json.data?.files;
        
        if (data?.nodes?.length) {
            mediaCount += data.nodes.length;
        }
        hasNextPage = data?.pageInfo?.hasNextPage || false;
        cursor = data?.pageInfo?.endCursor || null;
        if (mediaCount >= 10000) break;
    }
    
    if (useCache) {
        await setInCache(shop, 'mediaCount', mediaCount);
    }
    
    return mediaCount;
}

/**
 * Récupère tous les counts en parallèle avec cache
 */
export async function getAllCounts(admin: AdminGraphQL, shop: string): Promise<{ mfCount: number; moCount: number; mediaCount: number }> {
    // D'abord, essayer de récupérer tous les counts du cache en une seule requête
    const cachedCounts = await getMultipleFromCache(shop, ['mfCount', 'moCount', 'mediaCount']);
    
    // Lancer les requêtes seulement pour les counts manquants, en parallèle
    const promises: Promise<void>[] = [];
    const result = { mfCount: 0, moCount: 0, mediaCount: 0 };
    
    if (cachedCounts.mfCount !== null) {
        result.mfCount = cachedCounts.mfCount;
    } else {
        promises.push(getMetafieldCount(admin, shop, false).then(c => { result.mfCount = c; setInCache(shop, 'mfCount', c); }));
    }
    
    if (cachedCounts.moCount !== null) {
        result.moCount = cachedCounts.moCount;
    } else {
        promises.push(getMetaobjectCount(admin, shop, false).then(c => { result.moCount = c; setInCache(shop, 'moCount', c); }));
    }
    
    if (cachedCounts.mediaCount !== null) {
        result.mediaCount = cachedCounts.mediaCount;
    } else {
        promises.push(getMediaCount(admin, shop, false).then(c => { result.mediaCount = c; setInCache(shop, 'mediaCount', c); }));
    }
    
    await Promise.all(promises);
    
    return result;
}

/**
 * Récupère le domaine du shop
 */
export async function getShopDomain(admin: AdminGraphQL): Promise<string> {
    const res = await admin.graphql(`{ shop { myshopifyDomain } }`);
    const json = await res.json();
    return json.data?.shop?.myshopifyDomain || '';
}

/**
 * Compte les menus (navigation) avec cache
 * Nécessite le scope read_online_store_navigation.
 */
export async function getMenuCount(admin: AdminGraphQL, shop: string, useCache = true): Promise<number> {
    try {
        if (useCache) {
            const cached = await getFromCache(shop, 'menuCount');
            if (cached !== null) return cached;
        }

        let menuCount = 0;
        let hasNextPage = true;
        let cursor: string | null = null;

        while (hasNextPage) {
            const res = await admin.graphql(
                `query getMenusCount($cursor: String) {
                    menus(first: 250, after: $cursor) {
                        pageInfo { hasNextPage endCursor }
                        nodes { id }
                    }
                }`,
                { variables: { cursor } }
            );
            const json: any = await res.json();
            const data = json.data?.menus;
            if (data?.nodes?.length) menuCount += data.nodes.length;
            hasNextPage = data?.pageInfo?.hasNextPage || false;
            cursor = data?.pageInfo?.endCursor || null;
            if (menuCount >= 500) break;
        }

        if (useCache) await setInCache(shop, 'menuCount', menuCount);
        return menuCount;
    } catch {
        return 0;
    }
}

/**
 * Récupère l'ID du thème actif
 */
export async function getActiveThemeId(admin: AdminGraphQL): Promise<string | null> {
    const res = await admin.graphql(`{ themes(first: 1, roles: [MAIN]) { nodes { id } } }`);
    const json = await res.json();
    return json.data?.themes?.nodes?.[0]?.id?.split('/').pop() || null;
}

/**
 * Compte les sections (fichiers sections/*.liquid) avec cache
 * Nécessite l'accès REST aux assets du thème
 */
export async function getSectionsCount(admin: AdminGraphQL, shop: string, accessToken: string, useCache = true): Promise<number> {
    try {
        if (useCache) {
            const cached = await getFromCache(shop, 'sectionsCount');
            if (cached !== null) return cached;
        }

        // Récupérer le thème actif
        const themeId = await getActiveThemeId(admin);
        if (!themeId) return 0;

        // Récupérer les assets via REST API
        const assetsRes = await fetch(`https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`, {
            headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" }
        });

        if (!assetsRes.ok) return 0;

        const assetsJson = await assetsRes.json();
        const assets = assetsJson.assets || [];

        // Compter les fichiers sections/*.liquid
        const sectionsCount = assets.filter((a: { key: string }) =>
            a.key.startsWith('sections/') && a.key.endsWith('.liquid')
        ).length;

        if (useCache) {
            await setInCache(shop, 'sectionsCount', sectionsCount);
        }

        return sectionsCount;
    } catch {
        return 0;
    }
}

/**
 * Compte les templates (fichiers templates/*.json) avec cache
 * Nécessite l'accès REST aux assets du thème
 */
export async function getTemplatesCount(admin: AdminGraphQL, shop: string, accessToken: string, useCache = true): Promise<number> {
    try {
        if (useCache) {
            const cached = await getFromCache(shop, 'templatesCount');
            if (cached !== null) return cached;
        }

        // Récupérer le thème actif
        const themeId = await getActiveThemeId(admin);
        if (!themeId) return 0;

        // Récupérer les assets via REST API
        const assetsRes = await fetch(`https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`, {
            headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" }
        });

        if (!assetsRes.ok) return 0;

        const assetsJson = await assetsRes.json();
        const assets = assetsJson.assets || [];

        // Compter les fichiers templates/*.json
        const templatesCount = assets.filter((a: { key: string }) =>
            a.key.startsWith('templates/') && a.key.endsWith('.json')
        ).length;

        if (useCache) {
            await setInCache(shop, 'templatesCount', templatesCount);
        }

        return templatesCount;
    } catch {
        return 0;
    }
}
