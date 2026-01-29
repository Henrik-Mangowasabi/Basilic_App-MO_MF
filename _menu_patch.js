const fs = require("fs");
const path = "app/routes/app.menu.tsx";
let s = fs.readFileSync(path, "utf8");
const old = `                            {menus.length === 0
                                ? "Aucun menu de navigation ou scope read_online_store_navigation manquant. Vérifiez les paramètres de l'app."
                                : "Aucun résultat pour ce filtre ou cette recherche."}`;
const repl = `                            {menus.length === 0 && menusError ? (
                                <>
                                    <p className="font-medium text-[#E11D48]">{menusError}</p>
                                    <p>
                                        L'app a besoin du scope <code className="px-1.5 py-0.5 bg-[#E4E4E7] rounded text-[13px]">read_online_store_navigation</code> pour lister les menus.
                                        Réautorisez l'app (désinstallez puis réinstallez, ou via le tableau de bord partenaire) pour accorder ce droit.
                                    </p>
                                </>
                            ) : menus.length === 0 ? (
                                "Aucun menu de navigation ou scope read_online_store_navigation manquant. Réautorisez l'app pour accorder ce droit."
                            ) : (
                                "Aucun résultat pour ce filtre ou cette recherche."
                            )}`;
if (!s.includes("Aucun menu de navigation ou scope read_online_store_navigation manquant. Vérifiez")) {
  console.error("old snippet not found");
  process.exit(1);
}
s = s.replace(old, repl);
fs.writeFileSync(path, s);
console.log("patched");
