# Validation : scan au chargement de la page d'accueil

## Comportement attendu (à valider à 100 %)

### 1. Ouverture de l’app → page d’accueil « Basilic App - Gestion »

- [ ] L’app s’ouvre sur la **page d’accueil** (pas directement sur Champs Méta).
- [ ] La **modale de scan** s’affiche immédiatement (cercle de progression + pourcentage).
- [ ] La barre de progression **avance en temps réel** (0 % → 100 %).
- [ ] À 100 %, la modale se ferme et la page d’accueil reste affichée.
- [ ] Aucune redirection vers Champs Méta (MF).

### 2. Après le scan → navigation

- [ ] Tu peux cliquer sur **Champs Méta (MF)** : la page MF se charge **sans** modale de scan.
- [ ] La colonne **CODE** (Oui/Non) est déjà remplie grâce au scan fait à l’accueil.
- [ ] En changeant d’onglet (MF → MO → Templates → Médias) : seule la **modale « Chargement… »** (spinner) apparaît, **jamais** la modale de scan.
- [ ] Une fois les données chargées, la navigation reste rapide (pas de re-scan).

### 3. Clic sur « Scan Code » (sur MF, MO ou Templates)

- [ ] Sur la page **Champs Méta**, clic sur **Scan Code** : la **modale de scan** (avec %) s’affiche, le scan se lance, puis la modale se ferme.
- [ ] Sur la page **Objets Méta**, clic sur **Scan Code** : même comportement (scan des metaobjects).
- [ ] Sur la page **Templates**, clic sur **Scan Code** : même idée (scan des templates).
- [ ] La modale de scan n’apparaît **que** dans ces cas (clic Scan Code), pas lors d’un simple changement d’onglet.

### 4. Une seule fois par session

- [ ] Après avoir fermé la modale à l’accueil, si tu reviens sur la page d’accueil (en cliquant sur « Accueil »), **aucune** modale de scan ne réapparaît.
- [ ] Pour revoir la modale de scan sur l’accueil, il faut une **nouvelle session** (nouvel onglet ou rechargement après avoir vidé `sessionStorage` ou fermé l’onglet).

---

## Résumé des changements techniques

- **Page d’accueil** (`app._index.tsx`) : au premier chargement, si `sessionStorage.mf_scanned` n’est pas défini, on lance le fetch vers `/app/api/mf-scan`, on affiche la modale de scan avec progression réelle, on enregistre les résultats dans `sessionStorage` (`mf_scan_results`), puis on ferme la modale. Titre de la page : « Basilic App - Gestion ».
- **Page Champs Méta** (`app.mf.tsx`) : suppression du scan automatique au premier passage sur MF (plus de redirection vers `?scan=true`). Le scan ne se fait que quand on clique sur « Scan Code ».
- Le scan à l’accueil utilise la **même API** (`/app/api/mf-scan`) et le **même stockage** (`mf_scan_results`) que la page MF, donc la colonne CODE sur MF est bien alimentée après le scan à l’accueil.

---

## Comment tester

1. Ouvrir l’app (ou recharger) et vérifier qu’on arrive bien sur la page d’accueil.
2. Cocher chaque point de la checklist ci-dessus en reproduisant les scénarios.
3. Pour retester le scan à l’accueil dans la même session : ouvrir la console (F12), exécuter `sessionStorage.removeItem('mf_scanned')`, puis recharger la page ; la modale de scan doit réapparaître à l’accueil.
