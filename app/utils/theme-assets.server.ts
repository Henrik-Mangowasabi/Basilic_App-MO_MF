/**
 * Utilitaire partagé pour les appels REST API Shopify avec gestion des rate limits (429).
 * Utilisé par tous les scan endpoints pour éviter les erreurs de throttling.
 */

/**
 * Fetch avec retry automatique et backoff exponentiel pour les 429.
 * Utilise le header Retry-After de Shopify si disponible.
 */
export async function fetchWithRetry(
    url: string,
    headers: Record<string, string>,
    maxAttempts = 5,
    baseDelayMs = 1000
): Promise<Response> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const res = await fetch(url, { headers });
            if (res.ok) return res;

            if (res.status === 429) {
                const retryAfter = res.headers.get('Retry-After');
                const delayMs = retryAfter
                    ? parseFloat(retryAfter) * 1000
                    : baseDelayMs * Math.pow(2, attempt);
                console.log(`[FETCH-RETRY] 429 on ${url.split('?')[0]}, retry in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxAttempts})`);
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }

            // Erreur non-retryable
            return res;
        } catch (e) {
            if (attempt === maxAttempts - 1) throw e;
            const delayMs = baseDelayMs * Math.pow(2, attempt);
            console.log(`[FETCH-RETRY] Network error, retry in ${delayMs}ms (attempt ${attempt + 1}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw new Error(`Max retries (${maxAttempts}) exceeded for ${url.split('?')[0]}`);
}

/**
 * Récupère la liste des assets du thème avec retry.
 */
export async function fetchAssetsList(
    domain: string,
    themeId: string,
    accessToken: string
): Promise<{ key: string }[]> {
    const url = `https://${domain}/admin/api/2024-10/themes/${themeId}/assets.json`;
    const headers = { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" };
    const res = await fetchWithRetry(url, headers);
    if (!res.ok) throw new Error(`Assets API returned ${res.status}`);
    const json = await res.json();
    return (json.assets || []) as { key: string }[];
}

/**
 * Récupère le contenu d'un asset avec retry.
 * Retourne une chaîne vide si l'asset ne peut pas être lu.
 */
export async function fetchAssetContent(
    domain: string,
    themeId: string,
    accessToken: string,
    assetKey: string
): Promise<string> {
    const url = `https://${domain}/admin/api/2024-10/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(assetKey)}`;
    const headers = { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" };
    try {
        const res = await fetchWithRetry(url, headers, 4, 1500);
        if (!res.ok) return "";
        const json = await res.json();
        return json.asset?.value || "";
    } catch (e) {
        console.warn(`[FETCH-ASSET] Failed to fetch ${assetKey}:`, e);
        return "";
    }
}

/**
 * Scanne les assets par batch avec rate limiting adaptatif.
 * Retourne un tableau de { key, content } pour les assets qui ont du contenu.
 */
export async function scanAssetsInBatches(
    assets: { key: string }[],
    domain: string,
    themeId: string,
    accessToken: string,
    onProgress?: (scanned: number, total: number) => void,
    batchSize = 2,
    delayMs = 200
): Promise<{ key: string; content: string }[]> {
    const results: { key: string; content: string }[] = [];

    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(async (asset) => {
                const content = await fetchAssetContent(domain, themeId, accessToken, asset.key);
                return { key: asset.key, content };
            })
        );

        for (const r of batchResults) {
            if (r.content) results.push(r);
        }

        onProgress?.(Math.min(i + batch.length, assets.length), assets.length);

        if (i + batchSize < assets.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return results;
}
