import { apiVersion } from "../shopify.server";

export async function renameShopifyTemplate({
  shop,
  token,
  themeId,
  oldKey,
  newKey,
}: {
  shop: string;
  token: string;
  themeId: string | number;
  oldKey: string;
  newKey: string;
}) {
  // On utilise la version stable 2024-10 pour plus de fiabilité sur le REST
  const version = "2024-10";
  const baseUrl = `https://${shop}/admin/api/${version}/themes/${themeId}/assets.json`;

  try {
    // 1. LIRE
    const getRes = await fetch(`${baseUrl}?asset[key]=${encodeURIComponent(oldKey)}`, {
      headers: { "X-Shopify-Access-Token": token, "Accept": "application/json" },
    });
    
    if (!getRes.ok) throw new Error(`Source introuvable (${getRes.status})`);
    
    const data = await getRes.json();
    const content = data.asset?.value || data.asset?.attachment;
    if (!content) throw new Error("Le fichier source est vide.");

    // 2. CRÉER
    const putRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ asset: { key: newKey, value: content } }),
    });

    if (!putRes.ok) {
        const err = await putRes.text();
        throw new Error(`Erreur création : ${err}`);
    }

    // 3. SUPPRIMER (Correction : Ajout explicite de method DELETE)
    const delRes = await fetch(`${baseUrl}?asset[key]=${encodeURIComponent(oldKey)}`, {
      method: "DELETE",
      headers: { "X-Shopify-Access-Token": token },
    });

    if (!delRes.ok) console.warn("Ancien fichier non supprimé, mais nouveau créé.");

    return { success: true };
  } catch (error: any) {
    console.error("[Rename Utility Error]", error.message);
    return { success: false, error: error.message };
  }
}
