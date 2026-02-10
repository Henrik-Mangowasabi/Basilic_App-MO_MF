# 🐛 PROBLÈMES DÉTECTÉS ET SOLUTIONS

## État actuel
L'app fonctionne globalement mais le système de détection "CODE" est **incomplet et manque de nombreuses syntaxes réelles**.

---

## 🚨 PROBLÈME #1: Colonne "CODE" - Faux négatifs (affiche "Non" alors que c'est utilisé)

### Symptôme
- MF: Affiche "Non" pour des metafields qui SONT dans le code
- MO: Affiche "Non" pour des metaobjects qui SONT dans le code

### Cause
Le scan utilise une détection textuelle simple (`.includes()`) qui ne couvre que **quelques patterns basiques**.

### Patterns actuellement détectés:

**Pour MF (metafields):**
```liquid
✅ product.metafields.custom.my_field
✅ product.metafields['custom']['my_field']     // Partiellement - cherche 'my_field'
✅ "custom.my_field"
✅ 'custom.my_field'
✅ ["my_field"]
✅ ['my_field']
```

**Pour MO (metaobjects):**
```liquid
✅ "my_type"
✅ 'my_type'
✅ .my_type
✅ ['my_type']
✅ ["my_type"]
```

### Patterns MANQUANTS:

**Syntaxes réelles manquées pour MF:**
```liquid
❌ product.metafields['custom']['my_field']  // Recherche exacte deux niveaux
❌ product.metafields[namespace][key]        // Avec variables
❌ product.metafields.custom['my_field']     // Notation mixte
❌ metafields | map: 'my_field'              // Filtres Liquid
❌ where: 'key', 'my_field'                  // Conditions
❌ section.settings.metafield_key            // Settings dynamiques
❌ {%- assign x = product.metafields.custom.my_field -%}  // Assign
❌ custom_mf: product.metafields.custom.my_field  // Entre paramètres
```

**Syntaxes réelles manquées pour MO:**
```liquid
❌ metaobjects[type_var]       // Avec variable
❌ metaobjects.my_type         // Notation pointée
❌ settings.mo_type            // Via settings
❌ mo_type: 'my_type'          // Paramètre nommé
❌ metaobjects[type_name]      // Entre crochets
```

---

## 🚨 PROBLÈME #2: Données perdues à certains endroits

### Symptôme
Vous perdez des infos/données à certains endroits de l'app

### Causes potentielles

**Cause 1: Recherche oubliée**
- Vous tapez une lettre dans la barre de recherche
- La page filtre instantanément
- Vous oubliez que vous filtrez et croyez que les données sont perdues
- **Solution:** Barre de recherche doit être plus visible ou afficher "X résultat(s) / Y total"

**Cause 2: Cache sessionStorage obsolète**
- Vous modifiez le thème
- Le cache en sessionStorage n'est pas mise à jour
- Vous devez relancer un Scan Code
- **Solution:** Ajouter un timestamp au cache ou bouton "Rafraîchir le cache"

**Cause 3: Erreurs silencieuses du scan**
- Le scan échoue partiellement
- Aucun message d'erreur n'apparaît
- Les données partielles sont affichées
- **Solution:** Meilleur système d'erreur avec modal

**Cause 4: Pagination non visible**
- Trop d'éléments pour une page
- Pagination silencieuse
- L'utilisateur pense que les données sont perdues
- **Solution:** Afficher "Affichage X-Y sur Z total" bien visible

---

## ✅ SOLUTIONS PROPOSÉES

### **SOLUTION 1A: Améliorer la détection MF (Court terme)**

**Fichier:** `app/routes/app.api.mf-scan.tsx`
**Lignes à modifier:** 98-112 (dans la boucle de détection)

**Remplacer le code existant:**
```javascript
// ANCIEN CODE (incomplet):
if (content.includes(fullKey) ||
    content.includes(`.${key}`) ||
    content.includes(`"${key}"`) ||
    content.includes(`'${key}'`) ||
    content.includes(`["${key}"]`) ||
    content.includes(`['${key}']`)) {
    mfInCode.add(fullKey);
}

// PAR CE NOUVEAU CODE (plus complet):
if (content.includes(fullKey) ||                              // custom.key
    content.includes(`.${key}`) ||                            // .key
    content.includes(`"${key}"`) ||                           // "key"
    content.includes(`'${key}'`) ||                           // 'key'
    content.includes(`["${key}"]`) ||                         // ["key"]
    content.includes(`['${key}']`) ||                         // ['key']
    // ===== AJOUTS NOUVEAUX =====
    content.includes(`['${namespace}']['${key}']`) ||         // ['ns']['key']
    content.includes(`["${namespace}"]["${key}"]`) ||         // ["ns"]["key"]
    content.includes(`metafields.${namespace}.${key}`) ||     // metafields.ns.key
    content.includes(`metafields['${namespace}']['${key}']`) || // metafields['ns']['key']
    content.includes(`metafields["${namespace}"]["${key}"]`) || // metafields["ns"]["key"]
    content.includes(`metafields[${namespace}][${key}]`) ||     // metafields[ns][key] (variables)
    content.includes(`| map: '${key}'`) ||                    // Filtres
    content.includes(`| where: '${key}'`)) {
    mfInCode.add(fullKey);
}
```

---

### **SOLUTION 1B: Améliorer la détection MO (Court terme)**

**Fichier:** `app/routes/app.api.mo-scan.tsx`
**Lignes à modifier:** 68-78

**Remplacer le code existant:**
```javascript
// ANCIEN CODE:
if (content.includes(`"${type}"`) ||
    content.includes(`'${type}'`) ||
    content.includes(`.${type}`) ||
    content.includes(`['${type}']`) ||
    content.includes(`["${type}"]`)) {
    metaobjectsInCode.add(type);
}

// PAR CE NOUVEAU CODE:
if (content.includes(`"${type}"`) ||           // "type"
    content.includes(`'${type}'`) ||           // 'type'
    content.includes(`.${type}`) ||            // .type
    content.includes(`['${type}']`) ||         // ['type']
    content.includes(`["${type}"]`) ||         // ["type"]
    // ===== AJOUTS NOUVEAUX =====
    content.includes(`metaobjects['${type}']`) || // metaobjects['type']
    content.includes(`metaobjects["${type}"]`) || // metaobjects["type"]
    content.includes(`metaobjects.${type}`) ||    // metaobjects.type
    content.includes(`: '${type}'`) ||            // Paramètres
    content.includes(`: "${type}"`) ||
    content.includes(`[${type}]`)) {              // [type] avec variable
    metaobjectsInCode.add(type);
}
```

---

### **SOLUTION 2: Meilleure visibilité sur les données filtrées**

**Fichier:** Mettre à jour les pages `app.mf.tsx` et `app.mo.tsx`

**Ajouter dans la barre de recherche:**
```javascript
// Afficher le compte de résultats visibles
<span className="text-gray-500 text-sm">
  {filteredData.length} / {totalData.length} éléments
</span>
```

**Exemple:**
```
🔍 Rechercher...  [5 / 43 éléments]
```

---

### **SOLUTION 3: Ajouter un cache invalidation**

**Fichier:** `app/components/ScanProvider.tsx`

**Ajouter un bouton "Rafraîchir le cache":**
```javascript
const clearCache = useCallback(() => {
    sessionStorage.removeItem(MF_RESULTS_KEY);
    sessionStorage.removeItem(MO_RESULTS_KEY);
    sessionStorage.removeItem(TEMPLATE_RESULTS_KEY);
    sessionStorage.removeItem(MENU_RESULTS_KEY);
    sessionStorage.removeItem(SECTION_RESULTS_KEY);
    sessionStorage.removeItem(SCAN_DONE_KEY);
    startScan();
}, [startScan]);
```

---

### **SOLUTION 4: Meilleur système d'erreurs**

**Fichier:** `app/components/ScanProvider.tsx`

Le système existe déjà avec `scanError`, mais peut être amélioré avec:
- Détails de quel endpoint a échoué
- Suggestion d'actions (réessayer, vérifier les permissions)
- Log des erreurs

---

### **SOLUTION 5: Validation des données avec Test**

**Créer un fichier de test:** `tests/scan.test.ts`

**Tests à ajouter:**
```typescript
describe('MF Scan Detection', () => {
    it('should detect product.metafields.custom.my_field', () => {
        const content = 'product.metafields.custom.my_field';
        expect(scan(content)).toContain('custom.my_field');
    });

    it('should detect metafields["ns"]["key"]', () => {
        const content = 'product.metafields["custom"]["my_field"]';
        expect(scan(content)).toContain('custom.my_field');
    });

    it('should detect | map: "key" pattern', () => {
        const content = 'product.metafields | map: "my_field"';
        expect(scan(content)).toContain('custom.my_field');
    });
});
```

---

## 📋 PLAN D'IMPLÉMENTATION

### **Phase 1: Court terme (Immédiat - 1-2h)**
✅ **Prioriser:** Solutions 1A + 1B (améliorer la détection)
- Modifier les patterns de recherche
- Tester avec vos vrais metafields/metaobjects
- Valider que le scan fonctionne correctement

### **Phase 2: Moyen terme (Avant mise en prod - 2-4h)**
✅ **Ajouter:** Solutions 2 + 3 (UX amélioré)
- Afficher le compte filtré/total
- Ajouter bouton "Rafraîchir cache"
- Améliorer les messages d'erreur

### **Phase 3: Long terme (Optimisation - 4-8h)**
✅ **Envisager:**
- Ajout de tests automatisés
- Cache avec timestamp
- Support des regex dans les scans (plus flexible que `.includes()`)
- UI pour afficher les patterns détectés

---

## 🧪 COMMENT TESTER

### **Test 1: Vérifier la détection MF améliorée**

**Setup:**
1. Modifier `app.api.mf-scan.tsx` avec la nouvelle détection
2. Aller sur `/app/mf`
3. Cliquer "Scan Code"
4. Vérifier les résultats

**Cas de test:**
```liquid
# Dans votre thème, ajoutez cette ligne:
{{ product.metafields['custom']['my_test_field'] }}

# Vérifiez que "my_test_field" s'affiche maintenant en "Oui" dans la colonne CODE
```

### **Test 2: Vérifier la détection MO améliorée**

**Setup:**
1. Modifier `app.api.mo-scan.tsx` avec la nouvelle détection
2. Aller sur `/app/mo`
3. Cliquer "Scan Code"
4. Vérifier les résultats

**Cas de test:**
```liquid
# Dans votre thème:
{% assign collection_list = metaobjects['my_type'] %}

# Vérifiez que "my_type" s'affiche en "Oui"
```

---

## ⚖️ Avantages/Inconvénients

### **Avantages des solutions proposées:**
✅ Peu invasif - Modification mineure du code
✅ Pas de breaking changes
✅ Améliore immédiatement l'UX
✅ Facile à tester

### **Inconvénients:**
⚠️ La détection textuelle a des limites (cas très complexes)
⚠️ Peut générer de faux positifs si noms similaires
⚠️ Performance peut être impactée avec très beaucoup de fichiers

**Mitigation:**
- Utiliser une regex plus tard si besoin
- Ajouter un rate-limiting au scan
- Cache les résultats

---

## 🔗 Dépendances

Aucune nouvelle dépendance nécessaire pour les solutions 1 et 2.

Les solutions futures (3+) peuvent nécessiter:
- Date-fns pour gestion du cache
- Regex-parser pour détection avancée

---

## ✨ Résultat attendu

**Avant:**
```
METAFIELD: custom.my_field
CODE: Non ❌ (alors qu'il est utilisé)
```

**Après:**
```
METAFIELD: custom.my_field
CODE: Oui ✅ (correctement détecté)
```

Et avec la solution 2:
```
🔍 [Rechercher...]  [5 / 43 éléments visible/total]
```

---

## 📞 Questions avant implémentation?

Avant de commencer:
1. Confirmez-vous que vous voulez améliorer la détection?
2. Avez-vous des patterns supplémentaires à détecter?
3. Avez-vous d'autres endroits où vous perdez des données?
4. Priorité: UX amélioré ou correctif des faux négatifs en priorité?
