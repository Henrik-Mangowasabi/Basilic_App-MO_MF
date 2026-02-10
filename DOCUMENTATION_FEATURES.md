# 📱 APP MM-MO-MF - Documentation Complète

## 🎯 Vue d'ensemble
L'app **MM-MO-MF** est une application Shopify permettant de gérer et analyser les **Metafields (MF)**, **Metaobjects (MO)**, **Templates**, **Sections**, **Menu** et **Media** d'un thème.

Elle scanne automatiquement le code du thème pour détecter quels metafields/metaobjects sont utilisés dans le code Liquid/JSON.

---

## 📊 Sections Principales

### 1. **METAFIELDS (MF)** - `/app/mf`
**Description:** Gestion des champs de données personnalisés attachés aux ressources Shopify.

#### Fonctionnalités:
- **Affichage par type de ressource:**
  - Produits (PRODUCT)
  - Variantes (PRODUCTVARIANT)
  - Collections (COLLECTION)
  - Clients (CUSTOMER)
  - Commandes (ORDER)
  - Commandes Provisoires (DRAFTORDER)
  - Entreprises B2B (COMPANY)
  - Emplacements/Stock (LOCATION)
  - Marchés (MARKET)
  - Pages (PAGE)
  - Blogs (BLOG)
  - Articles (ARTICLE)
  - Boutique (SHOP)

#### Colonnes affichées:
1. **NOM DU METAFIELD** - Nom + Description du champ
2. **ASSING. (Assignations)** - Nombre de ressources avec ce metafield (cliquable = modal avec liste)
3. **LIEN** - Accès direct à Shopify
4. **Menu** - Actions (Editer, Supprimer)

#### Colonnes en Dev Mode:
- **CLÉ TECH** - Clé complète (namespace.key)
- **STRUCTURE** - Type de données (Texte, Entier, Booléen, etc.)
- **DIAG** - Diagnostic (Manuel/App installée/Désinstallée)
- **CODE** - ⚠️ **PROBLÈME IDENTIFIÉ**: Affiche "Oui/Non" si le metafield est utilisé dans le code

#### Actions disponibles:
- ✏️ **Editer** - Modifier le nom/description
- 🗑️ **Supprimer** - Supprimer le metafield
- 🔍 **Générer descriptions manquantes** - Auto-génère des descriptions
- 🔄 **Scan Code** - Lance le scan du thème

---

### 2. **METAOBJECTS (MO)** - `/app/mo`
**Description:** Gestion des types d'objets personnalisés (structures de données).

#### Colonnes affichées:
1. **NOM DE L'OBJET** - Nom + Description
2. **ENTRÉES** - Nombre d'entrées existantes (cliquable = modal)
3. **LIEN** - Accès direct à Shopify
4. **Menu** - Actions

#### Colonnes en Dev Mode:
- **CLÉ TECH** - Type technique
- **CHAMPS** - Nombre de champs (cliquable = modal édition)
- **CODE** - ⚠️ **PROBLÈME IDENTIFIÉ**: Affiche "Oui/Non" si le metaobject est utilisé

#### Actions disponibles:
- ✏️ **Editer** - Modifier nom/description
- 🏗️ **Gérer champs** - Éditer la structure
- 📊 **Gérer entrées** - Voir/créer/supprimer les entrées
- 🗑️ **Supprimer** - Supprimer le type
- 🔄 **Scan Code** - Lance le scan

---

### 3. **TEMPLATES** - `/app/templates`
**Description:** Gestion des templates du thème.

#### Colonnes affichées:
1. **NOM DU TEMPLATE** - Nom + Clé fichier
2. **DATE DE CRÉATION** - Date du dernier update
3. **ASSIGNATIONS ACTIVES** - Nombre de ressources actives (cliquable = modal)
4. **ASSIGNATIONS INACTIVES** - Nombre de ressources inactives (cliquable = modal)

---

### 4. **SECTIONS**, **MENU**, **MEDIA**
- Gestion des sections réutilisables du thème
- Gestion des menus de navigation
- Gestion des fichiers média

---

## 🔍 SYSTÈME DE SCAN CODE - LE CŒUR DU PROBLÈME

### Comment ça fonctionne:

#### **1. Initiation du scan:**
- Bouton "Scan Code" disponible sur chaque page
- Lance 5 scans en parallèle via SSE (Server-Sent Events)
- Résultats mis en cache dans sessionStorage
- Page se recharge après pour afficher les résultats

#### **2. Les 5 scans parallèles:**

**MF-Scan** (`/api/mf-scan`):
```javascript
// Étape 1: Récupère TOUS les metafields (namespace.key) de Shopify
// Pour chaque Owner Type: PRODUCT, PRODUCTVARIANT, COLLECTION, etc.
// Résultat: Array de fullKeys comme "custom.my_field"

// Étape 2: Scanne tous les fichiers .liquid et .json du thème
// Étape 3: Pour CHAQUE fullKey, cherche les patterns:
- fullKey complet: "custom.my_field"
- Juste la clé: .my_field, "my_field", 'my_field'
- Entre crochets: ["my_field"], ['my_field']

// ⚠️ PATTERNS CHERCHÉS (fichier: app.api.mf-scan.tsx, lignes 104-109):
if (content.includes(fullKey) ||
    content.includes(\`.${key}\`) ||
    content.includes(\`"${key}"\`) ||
    content.includes(\`'${key}'\`) ||
    content.includes(\`["${key}"]\`) ||
    content.includes(\`['${key}']\`)) {
    mfInCode.add(fullKey);
}
```

**MO-Scan** (`/api/mo-scan`):
```javascript
// Récupère les types de metaobjects
// Cherche dans le code:
- "type_name"
- 'type_name'
- .type_name
- ['type_name']
- ["type_name"]
```

**Template-Scan** (`/api/template-scan`):
```javascript
// Récupère les suffixes de templates
// Cherche si utilisés dans le code
```

---

## 🚨 PROBLÈMES IDENTIFIÉS

### **PROBLÈME 1: Colonnes "CODE" affichent "Non" alors que les données sont dans le code**

#### **Root Cause:**
La détection est basée sur une recherche textuelle simple (`.includes()`) qui ne couvre pas tous les cas d'usage réels.

#### **Cas manqués dans le scan MF:**

**❌ Ceci ne sera PAS détecté:**
```liquid
{%- assign my_value = product.metafields['custom']['my_field'] -%}
{%- assign my_value = product.metafields[namespace][key] -%}
{%- if product.metafields.custom.my_field -%}
{%- capture value -%}{{ product.metafields | map: 'my_field' }}{%- endcapture -%}
{%- assign filtered = collection.metafields | where: 'key', 'my_field' -%}
{% include 'file' with metafield: product.metafields[settings.mf_key] %}
{{ section.settings.metafield_name }}
```

**✅ Ceci sera détecté:**
```liquid
product.metafields.custom.my_field
product.metafields['custom']['my_field'] (partiellement - cherche 'my_field')
"custom.my_field"
```

#### **Cas manqués dans le scan MO:**
```liquid
{%- assign mo = metaobjects[type_name].first -%}
{%- assign list = metaobjects[section.settings.mo_type] -%}
{% include 'component' with mo_type: 'my_type' %}
```

---

### **PROBLÈME 2: Données perdues**

Possible causes:
1. **Cache obsolète** - sessionStorage garde les anciennes données
2. **Recherche/Filtrage cache** - Vous utilisez la barre de recherche et oubliez que vous filtrez
3. **Pagination** - Si trop d'éléments, certains peuvent être cachés
4. **Erreurs silencieuses** - Le scan échoue mais ne montre pas d'erreur

---

## 📋 PLAN D'ACTION - ÉTAPES À VÉRIFIER

### **Étape 1: Identifier le problème exact**

**A. Vérifier ce qui est dans le code:**
- Allez sur `/app/mf`
- Notez un metafield qui affiche "Non" en colonne CODE
- Ouvrez votre thème Shopify et cherchez ce metafield manuellement
- Notez EXACTEMENT la syntaxe Liquid trouvée

**B. Vérifier le scan:**
1. Ouvrir DevTools > Console
2. Cliquer "Scan Code"
3. Attendre la fin du scan
4. Vérifier sessionStorage:
   ```javascript
   console.log(JSON.parse(sessionStorage.getItem('mf_scan_results')))
   ```
5. Chercher votre metafield dans le résultat

**C. Vérifier la détection:**
1. Dans DevTools, taper:
   ```javascript
   const results = JSON.parse(sessionStorage.getItem('mf_scan_results'));
   console.log(results.includes('custom.my_field')); // true/false
   ```

### **Étape 2: Valider les données affichées**

**Pour MF:**
1. Page `/app/mf`
2. Vérifier qu'aucun filtre n'est actif (barre de recherche vide)
3. Vérifier que vous êtes sur la bonne section (Produits, Variantes, etc.)
4. Comptez manuellement les metafields affichés
5. Comparez avec le compteur "MF" en haut

**Pour MO:**
1. Page `/app/mo`
2. Même vérifications que MF
3. Vérifier que la table est bien ouverte (peut être fermée)

---

## 🔧 SOLUTIONS RECOMMANDÉES

### **Court terme (pour vérifier):**

**1. Ajouter du logging au scan:**
- Afficher les résultats bruts du scan
- Afficher les patterns cherchés
- Afficher les fichiers scannés

**2. Améliorer la détection MF:**
Ajouter ces patterns manquants dans le scan:
```javascript
// Patterns à ajouter dans app.api.mf-scan.tsx
content.includes(`['${namespace}']['${key}']`) ||
content.includes(`["${namespace}"]["${key}"]`) ||
content.includes(`metafields.${namespace}.${key}`) ||
content.includes(`metafields['${namespace}']['${key}']`) ||
content.includes(`['${namespace}'][${key}]`) ||
```

**3. Améliorer la détection MO:**
```javascript
// Patterns à ajouter dans app.api.mo-scan.tsx
content.includes(`metaobjects['${type}']`) ||
content.includes(`[${type}]`) ||
content.includes(`with mo_type: '${type}'`) ||
```

---

## 📊 Architecture Technique

### **Stack:**
- React Router 7
- Shopify Admin API
- Prisma pour la BD
- Server-Sent Events (SSE) pour streaming
- SessionStorage pour cache client
- Polaris + Custom UI

### **Fichiers clés:**
```
app/
├── components/
│   └── ScanProvider.tsx        ← Contexte + logique scan
├── routes/
│   ├── app.mf.tsx              ← Page Metafields
│   ├── app.mo.tsx              ← Page Metaobjects
│   ├── app.templates.tsx        ← Page Templates
│   ├── app.api.mf-scan.tsx      ← Scan MF
│   ├── app.api.mo-scan.tsx      ← Scan MO
│   ├── app.api.template-scan.tsx ← Scan Templates
│   └── ...
└── styles/
    └── basilic-ui.css
```

---

## ✅ Checklist de Validation

Pour valider que tout fonctionne:

- [ ] Scan MF complète sans erreur
- [ ] Scan MO complète sans erreur
- [ ] Colonnes "CODE" affichent des valeurs correctes
- [ ] Données affichées correspondent aux données réelles
- [ ] Recherche filtre correctement
- [ ] Dev Mode affiche les clés techniques
- [ ] Statut de révision se sauvegarde
- [ ] Aucune donnée perdue après refresh

---

## 💡 Points Clés à Retenir

1. **Le scan est basé sur une recherche textuelle simple** - Il peut manquer des syntaxes complexes
2. **SessionStorage en cache** - Peut devenir obsolète si code modifié
3. **Dev Mode pour vérifier les clés** - Activez-le pour debug
4. **Auto-reload après scan** - Prévu pour synchroniser le cache
5. **Les données sont spécifiques au shop** - Pas de partage entre shops

---

## 🐛 Pour Déboguer en Cas de Problème

```javascript
// Console DevTools:

// 1. Vérifier le cache après scan
JSON.parse(sessionStorage.getItem('mf_scan_results'))

// 2. Chercher un metafield spécifique
const results = JSON.parse(sessionStorage.getItem('mf_scan_results'));
results.find(r => r.includes('mon_metafield'))

// 3. Vérifier si scan a été complété
sessionStorage.getItem('basilic_scan_done')

// 4. Vérifier les erreurs du scan
// Vérifier l'onglet Network > XHR après clique sur "Scan Code"
```

