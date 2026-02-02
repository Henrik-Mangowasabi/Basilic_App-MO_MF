# 🎨 Référence des Composants - Basilic

> Liste complète des composants UI utilisés dans l'application

---

## 📦 Composants externes

### HeroUI (@heroui/react)

L'application utilise principalement HeroUI pour les composants de base.

#### Table Components

##### Table
**Usage:** Affichage de données tabulaires avec sélection multiple

```typescript
import { Table } from "@heroui/react";

<Table
    aria-label="Description"
    removeWrapper // Enlève le wrapper par défaut
    selectionMode="multiple" // Permet sélection multiple
    selectionBehavior="checkbox" // Affiche des checkboxes
    selectedKeys={selectedKeys}
    onSelectionChange={handleSelectionChange}
    onRowAction={handleRowAction}
    className="custom-class"
    classNames={{
        th: "header-class",
        td: "cell-class",
        tr: "row-class"
    }}
>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
</Table>
```

**Props principales:**
- `aria-label`: Label accessible (requis)
- `removeWrapper`: Enlève le wrapper par défaut
- `selectionMode`: "none" | "single" | "multiple"
- `selectionBehavior`: "toggle" | "replace" | "checkbox"
- `selectedKeys`: Set<string> ou "all"
- `onSelectionChange`: (keys: Set<string> | "all") => void
- `onRowAction`: (key: React.Key) => void
- `classNames`: Personnalisation des styles

**Utilisé dans:** Toutes les pages (mf, mo, templates, sections, menu)

**Fichiers:**
- `app/routes/app.mf.tsx:671`
- `app/routes/app.mo.tsx:582`
- `app/routes/app.templates.tsx:452`
- `app/routes/app.sections.tsx:445`
- `app/routes/app.menu.tsx:318`

---

##### TableHeader
**Usage:** En-tête de table avec colonnes

```typescript
import { TableHeader, TableColumn } from "@heroui/react";

<TableHeader columns={columns}>
    {(column) => (
        <TableColumn
            key={column.key}
            align={column.align || "start"}
            className={column.className}
            allowsSorting={column.sortable}
        >
            {column.label}
        </TableColumn>
    )}
</TableHeader>
```

**Props TableColumn:**
- `key`: Identifiant unique
- `align`: "start" | "center" | "end"
- `className`: Classes CSS
- `allowsSorting`: Active le tri
- `children`: Contenu de la colonne

---

##### TableBody
**Usage:** Corps de la table avec données

```typescript
import { TableBody, TableRow, TableCell } from "@heroui/react";

<TableBody
    items={data}
    emptyContent="Aucune donnée trouvée."
>
    {(item) => (
        <TableRow key={item.id} className={getRowClassName(item)}>
            {(columnKey) => (
                <TableCell>
                    {renderCell(item, columnKey)}
                </TableCell>
            )}
        </TableRow>
    )}
</TableBody>
```

**Props TableBody:**
- `items`: Array de données
- `emptyContent`: Message si vide

**Props TableRow:**
- `key`: Identifiant unique
- `className`: Classes CSS (ex: pour review status)

---

#### Modal Components

##### Modal
**Usage:** Dialogues modaux pour édition, suppression, détails

```typescript
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter
} from "@heroui/react";

<Modal
    isOpen={isOpen}
    onClose={onClose}
    size="2xl" // xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, full
    scrollBehavior="inside" // inside | outside
    backdrop="blur" // opaque | blur | transparent
    classNames={{
        base: "bg-white",
        header: "border-b border-[#E4E4E7]",
        body: "py-6",
        footer: "border-t border-[#E4E4E7]"
    }}
>
    <ModalContent>
        {(onClose) => (
            <>
                <ModalHeader>Titre</ModalHeader>
                <ModalBody>Contenu</ModalBody>
                <ModalFooter>
                    <Button onPress={onClose}>Fermer</Button>
                </ModalFooter>
            </>
        )}
    </ModalContent>
</Modal>
```

**Props principales:**
- `isOpen`: Booléen de visibilité
- `onClose`: Callback de fermeture
- `size`: Taille de la modale
- `scrollBehavior`: Comportement du scroll
- `backdrop`: Style du fond
- `classNames`: Personnalisation

**Utilisé dans:**
- `app.mf.tsx` : Édition metafields, suppression, view details
- `app.mo.tsx` : Édition metaobjects, suppression
- `app.templates.tsx` : Liste des assignations
- `app.sections.tsx` : Liste des fichiers
- `app.menu.tsx` : (non utilisé actuellement)

---

#### Button
**Usage:** Boutons d'action

```typescript
import { Button } from "@heroui/react";

<Button
    color="primary" // default, primary, secondary, success, warning, danger
    variant="solid" // solid, bordered, light, flat, faded, shadow, ghost
    size="sm" // sm, md, lg
    onPress={handleClick}
    isLoading={isLoading}
    isDisabled={isDisabled}
    startContent={<Icon />}
    endContent={<Icon />}
    className="custom-class"
>
    Texte
</Button>
```

**Props principales:**
- `color`: Couleur du bouton
- `variant`: Variante de style
- `size`: Taille
- `onPress`: Callback de clic
- `isLoading`: Affiche un spinner
- `isDisabled`: Désactive le bouton
- `startContent`: Icône avant
- `endContent`: Icône après

**Utilisé dans:** Toutes les pages, modales, barres d'actions

---

#### Dropdown
**Usage:** Menus déroulants (actions, filtres)

```typescript
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem
} from "@heroui/react";

<Dropdown>
    <DropdownTrigger>
        <Button variant="flat">Actions</Button>
    </DropdownTrigger>
    <DropdownMenu
        aria-label="Actions"
        onAction={handleAction}
    >
        <DropdownItem key="edit">Éditer</DropdownItem>
        <DropdownItem key="delete" color="danger">
            Supprimer
        </DropdownItem>
    </DropdownMenu>
</Dropdown>
```

**Props DropdownMenu:**
- `aria-label`: Label accessible
- `onAction`: (key: React.Key) => void
- `disabledKeys`: Set<React.Key>

**Props DropdownItem:**
- `key`: Identifiant unique
- `color`: Couleur (danger pour suppression)
- `className`: Classes CSS

**Utilisé dans:**
- `app.mf.tsx:601` : Menu d'actions par ligne
- `app.mo.tsx:548` : Menu d'actions par ligne

---

#### Tooltip
**Usage:** Infobulles

```typescript
import { Tooltip } from "@heroui/react";

<Tooltip
    content="Description détaillée"
    placement="top" // top, bottom, left, right, etc.
    delay={500}
    closeDelay={0}
>
    <div>Hover me</div>
</Tooltip>
```

**Props principales:**
- `content`: Contenu du tooltip
- `placement`: Position
- `delay`: Délai d'apparition (ms)
- `closeDelay`: Délai de fermeture

**Utilisé dans:**
- `app.mf.tsx` : Affichage des champs de metaobjects
- `app.mo.tsx` : Affichage des field definitions

---

### Shopify Polaris (@shopify/polaris)

#### AppProvider
**Usage:** Provider principal pour Polaris (traductions, thème)

```typescript
import { AppProvider } from "@shopify/polaris";
import frTranslations from "@shopify/polaris/locales/fr.json";

<AppProvider i18n={frTranslations}>
    {/* App content */}
</AppProvider>
```

**Utilisé dans:** `app/routes/app.tsx:31`

---

### Shopify App Bridge React (@shopify/app-bridge-react)

#### NavMenu
**Usage:** Menu de navigation dans Shopify Admin

```typescript
import { NavMenu } from "@shopify/app-bridge-react";

<NavMenu>
    <Link to="/app" rel="home">Accueil</Link>
    <Link to="/app/mf">Champs Méta</Link>
    <Link to="/app/mo">Objets Méta</Link>
    <Link to="/app/templates">Templates</Link>
    <Link to="/app/sections">Sections</Link>
    <Link to="/app/menu">Menus</Link>
</NavMenu>
```

**Utilisé dans:** `app/routes/app.tsx:35`

---

### React Router (react-router)

#### Navigation Hooks

```typescript
import {
    useLoaderData,
    useActionData,
    useSubmit,
    useRevalidator,
    useNavigate,
    useLocation,
    useNavigation
} from "react-router";

// Données du loader
const data = useLoaderData<typeof loader>();

// Résultat de l'action
const actionData = useActionData<ActionResult>();

// Soumettre un formulaire
const submit = useSubmit();
submit(formData, { method: "post" });

// Recharger les données
const revalidator = useRevalidator();
revalidator.revalidate();

// Navigation programmatique
const navigate = useNavigate();
navigate("/app/mf");

// URL actuelle
const location = useLocation();
console.log(location.pathname);

// État de navigation
const navigation = useNavigation();
const isLoading = navigation.state === "loading";
```

**Utilisé dans:** Toutes les pages

---

## 🎨 Composants custom (BasilicUI)

**Fichier:** `app/components/BasilicUI.tsx`

### AppBrand
**Usage:** Logo et nom de l'application

```typescript
import { AppBrand } from "../components/BasilicUI";

<AppBrand
    name="Basilic"
    plan="free"
    logoColor="#4BB961"
    logoIcon={<span>B</span>}
/>
```

**Props:**
```typescript
{
    name?: string; // Défaut: "Basilic"
    plan?: string; // Défaut: "free"
    logoColor?: string; // Défaut: "#4BB961"
    logoIcon?: React.ReactNode; // Défaut: <span>B</span>
}
```

**Rendu:**
- Carré coloré avec icône (33x33px)
- Nom en bold
- Plan en gris

**Utilisé dans:** Toutes les pages (en haut à gauche)

---

### BasilicSearch
**Usage:** Barre de recherche avec raccourci clavier

```typescript
import { BasilicSearch } from "../components/BasilicUI";

<BasilicSearch
    value={search}
    onValueChange={setSearch}
    placeholder="Rechercher..."
/>
```

**Props:**
- Hérite de `HeroInput`
- Raccourci clavier: **Ctrl/Cmd + Shift + K**
- Icône de recherche intégrée
- Badge de raccourci affiché

**Features:**
- Détection automatique Mac/Windows
- Focus au montage
- Clearable automatique

**Utilisé dans:** Toutes les pages (en haut à droite)

---

### BasilicButton
**Usage:** Bouton stylisé Basilic

```typescript
import { BasilicButton } from "../components/BasilicUI";

<BasilicButton
    variant="solid"
    color="primary"
    icon={<Icon />}
    isLoading={false}
    onPress={handleClick}
>
    Texte du bouton
</BasilicButton>
```

**Props:**
```typescript
{
    icon?: React.ReactNode;
    // + toutes les props de HeroButton
}
```

**Styles par défaut:**
- Hauteur: 40px
- Padding: 16px
- Border radius: 12px
- Font size: 14px
- Gap entre icône et texte: 8px
- Effet hover: scale(1.02)
- Effet active: scale(0.98)

**Variante primary:**
- Background: #4BB961
- Shadow: verte personnalisée
- Texte: blanc

**Utilisé dans:** Toutes les pages (boutons d'action)

---

### NavigationTabs
**Usage:** Onglets de navigation avec counts

```typescript
import { NavigationTabs } from "../components/BasilicUI";

<NavigationTabs
    activePath={location.pathname}
    counts={{
        mf: mfCount,
        mo: moCount,
        t: totalTemplates,
        m: mediaCount,
        menu: menuCount,
        sections: sectionsCount
    }}
    disableNavigation={false}
    hideLoadingModal={false}
/>
```

**Props:**
```typescript
{
    activePath: string; // Chemin actif
    counts: {
        mf: number;
        mo: number;
        t?: number; // templates (optionnel)
        m?: number; // media (optionnel)
        menu?: number; // menus (optionnel)
        sections?: number; // sections (optionnel)
    };
    disableNavigation?: boolean; // Désactive la navigation
    hideLoadingModal?: boolean; // Cache la modale de chargement
}
```

**Features:**
- Onglets avec icônes
- Badge de count pour chaque onglet
- Onglet actif avec fond blanc et shadow
- Hover avec fond blanc et shadow
- Animation des counts
- Modale de chargement pendant navigation

**Onglets:**
1. **Champs Méta** - `/app/mf`
2. **Objets Méta** - `/app/mo`
3. **Templates** - `/app/templates`
4. **Sections** - `/app/sections`
5. **Menus** - `/app/menu`

**Styles:**
- Background: #F4F4F5/60
- Padding: 1.5
- Border radius: 20px
- Onglet actif: bg-white + shadow
- Count badge actif: bg-#4BB961 + scale(1.1)

**Utilisé dans:** Toutes les pages (sous le header)

---

### BasilicModal
**Usage:** Modale wrapper simplifiée

```typescript
import { BasilicModal } from "../components/BasilicUI";

<BasilicModal
    isOpen={isOpen}
    onClose={onClose}
    title="Titre de la modale"
    footer={<Button>OK</Button>}
    size="md"
>
    <p>Contenu de la modale</p>
</BasilicModal>
```

**Props:**
```typescript
{
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}
```

**Features:**
- Backdrop blur par défaut
- Header optionnel
- Footer optionnel
- Taille configurable

**Utilisé dans:** Modales d'édition, confirmation

---

### DevModeToggle
**Usage:** Toggle pour activer le mode développeur

```typescript
import { DevModeToggle } from "../components/BasilicUI";

<DevModeToggle
    isChecked={devMode}
    onChange={setDevMode}
/>
```

**Props:**
```typescript
{
    isChecked?: boolean; // Défaut: false
    onChange?: (value: boolean) => void;
}
```

**Rendu:**
- Icône de code
- Label "Dev Mode"
- Switch HeroUI

**Utilisé dans:** Peut être utilisé dans le header (non implémenté actuellement)

---

### BasilicDropdown
**Usage:** Dropdown wrapper simplifié

```typescript
import { BasilicDropdown } from "../components/BasilicUI";

<BasilicDropdown
    triggerLabel="Actions"
    items={[
        { key: "edit", label: "Éditer", color: "default" },
        { key: "delete", label: "Supprimer", color: "danger" }
    ]}
    onAction={handleAction}
/>
```

**Props:**
```typescript
{
    triggerLabel?: React.ReactNode; // Défaut: "Actions"
    items: Array<{
        key: string;
        label: string;
        color?: string;
        className?: string;
    }>;
    onAction?: (key: React.Key) => void;
}
```

**Styles:**
- Trigger: bouton flat avec icône chevron
- Menu: padding 1, rounded-lg
- Items: hover bg-default-100

**Utilisé dans:** Dropdowns d'actions

---

### BasilicTable
**Usage:** Table wrapper simplifié (legacy)

```typescript
import { BasilicTable } from "../components/BasilicUI";

<BasilicTable
    columns={columns}
    items={items}
    renderCell={renderCell}
/>
```

**Note:** Ce composant est rarement utilisé. Préférer `Table` de HeroUI directement.

---

## 🔄 Composants de contexte

### ScanProvider
**Fichier:** `app/components/ScanProvider.tsx`

**Usage:** Provider pour gérer l'état global du scan

```typescript
import { ScanProvider, useScan } from "../components/ScanProvider";

// Dans app.tsx
<ScanProvider>
    <App />
</ScanProvider>

// Dans une page
const {
    isScanning,
    startScan,
    mfResults,
    templateResults,
    moResults,
    menuResults
} = useScan();
```

**API du hook useScan:**
```typescript
{
    isScanning: boolean; // Scan en cours
    startScan: () => void; // Démarre un scan
    mfResults: string[]; // Résultats scan metafields
    templateResults: string[]; // Résultats scan templates
    moResults: string[]; // Résultats scan metaobjects
    menuResults: string[]; // Résultats scan menus
}
```

**Fonctionnement:**
1. `startScan()` appelle `/app/api/{page}-scan`
2. Écoute SSE (Server-Sent Events)
3. Met à jour la progression
4. Stocke les résultats
5. Déclenche revalidation

**Utilisé dans:**
- Provider: `app.tsx:33`
- Consumer: `app.mf.tsx`, `app.mo.tsx`, `app.templates.tsx`, `app.menu.tsx`

---

## 📊 Patterns de rendu

### Cell Renderers

Chaque page implémente une fonction `renderCell()` pour le rendu des cellules de table.

#### Pattern commun

```typescript
const renderCell = (item: any, columnKey: React.Key) => {
    switch (columnKey) {
        case "name":
            return (
                <div className="mf-cell mf-cell--multi">
                    <span className="mf-text--title">{item.name}</span>
                    <span className="mf-text--desc">{item.description}</span>
                </div>
            );

        case "count":
            return (
                <div className="mf-cell mf-cell--center">
                    <span className="mf-badge--count">
                        {item.count}
                    </span>
                </div>
            );

        case "actions":
            return (
                <div className="mf-cell mf-cell--end">
                    <Dropdown>...</Dropdown>
                </div>
            );

        default:
            return null;
    }
};
```

#### Classes CSS communes

**Cellules:**
- `mf-cell`: Cellule de base
- `mf-cell--multi`: Cellule avec titre + description
- `mf-cell--center`: Cellule centrée
- `mf-cell--start`: Alignée à gauche
- `mf-cell--end`: Alignée à droite

**Texte:**
- `mf-text--title`: Titre principal (14px, bold)
- `mf-text--desc`: Description (12px, gris)

**Badges:**
- `mf-badge--count`: Badge de count
- `bg-[#4BB961]/10 text-[#15803D]`: Badge vert (actif, utilisé)
- `bg-[#F43F5E]/10 text-[#DC2626]`: Badge rouge (inactif, non utilisé)
- `bg-[#E4E4E7]/50 text-[#71717A]`: Badge gris (neutre)

**Lignes de table:**
- `mf-table__row--to-review`: Ligne à review (fond jaune clair)
- `mf-table__row--reviewed`: Ligne reviewed (fond vert clair)

---

## 🎯 Composants spécialisés

### Section Header

**Pattern répété dans toutes les pages :**

```typescript
<div
    className={`mf-section__header ${isOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`}
    onClick={() => toggleSection()}
>
    <div className="mf-section__title-group">
        <span className="mf-section__icon">
            <Icon />
        </span>
        <span className="mf-section__title">
            {title}
        </span>
        <span className="mf-section__count">
            {count}
        </span>
    </div>
    <span className={`mf-section__chevron ${isOpen ? 'mf-section__chevron--open' : ''}`}>
        <ChevronRight />
    </span>
</div>
```

**Classes CSS:**
- `mf-section__header`: Header de section
- `mf-section__header--open`: Section ouverte
- `mf-section__header--closed`: Section fermée
- `mf-section__title-group`: Groupe titre + icône + count
- `mf-section__icon`: Icône de section
- `mf-section__title`: Titre de section
- `mf-section__count`: Badge de count
- `mf-section__chevron`: Icône chevron
- `mf-section__chevron--open`: Chevron vers le bas

---

### Bottom Action Bar

**Pattern répété dans toutes les pages :**

```typescript
{selectedKeys.size > 0 && (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-2xl ring-1 ring-white/10">

            {/* Count + Clear */}
            <div className="flex items-center gap-3">
                <span className="text-[14px] font-medium text-white">
                    {selectedKeys.size} sélectionnés
                </span>
                <button onClick={() => setSelectedKeys(new Set())}>
                    <ClearIcon />
                </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-[1px] bg-[#3F3F46]"></div>

            {/* Actions */}
            <Button>À review</Button>
            <Button>Review</Button>
            <Button variant="flat">Réinitialiser</Button>
            <Button color="danger">Supprimer</Button>
        </div>
    </div>
)}
```

**Styles:**
- Position: fixed bottom-8
- Centré horizontalement
- Z-index: 50
- Background: noir (#18181B)
- Shadow: 2xl
- Border radius: full (pill shape)
- Animation: slide-in-from-bottom

---

## 📋 Résumé des dépendances

### npm packages

```json
{
    "@heroui/react": "^x.x.x",
    "@shopify/polaris": "^x.x.x",
    "@shopify/app-bridge-react": "^x.x.x",
    "react-router": "^x.x.x",
    "react": "^18.x.x"
}
```

### Composants HeroUI utilisés

- [x] Table, TableHeader, TableColumn, TableBody, TableRow, TableCell
- [x] Modal, ModalContent, ModalHeader, ModalBody, ModalFooter
- [x] Button
- [x] Input
- [x] Dropdown, DropdownTrigger, DropdownMenu, DropdownItem
- [x] Tooltip
- [x] Switch
- [ ] Tabs, Tab (non utilisés directement)
- [ ] Card (non utilisé)
- [ ] Chip (non utilisé directement)

### Composants Polaris utilisés

- [x] AppProvider
- [ ] Page, Layout (non utilisés - structure custom)
- [ ] Card (non utilisé)
- [ ] Button (remplacé par HeroUI)

### Composants App Bridge utilisés

- [x] NavMenu
- [ ] TitleBar (non utilisé - header custom)
- [ ] Toast (non utilisé - system custom)

---

## 🎨 Icônes

### Source des icônes

Toutes les icônes sont des **SVG inline** définies dans chaque fichier.

**Bibliothèques de référence:**
- Lucide Icons (style)
- Heroicons (style)

### Icônes communes

**Navigation:**
- Cube (Metafields)
- Grid (Metaobjects)
- File (Templates)
- Layout (Sections)
- Menu (Menus)

**Actions:**
- Refresh (Actualiser)
- Search (Recherche)
- Edit (Éditer)
- Trash (Supprimer)
- Link (Lien externe)
- Sparkles (AI/Génération)
- ChevronRight (Expand)

**Status:**
- Check (Validé)
- X (Erreur)
- Clock (En attente)

---

## 📊 Statistiques

- **Composants HeroUI:** 10+ utilisés
- **Composants custom (BasilicUI):** 9 composants
- **Patterns de rendu:** 5+ cell renderers
- **Modales:** 15+ instances
- **Dropdowns:** 5+ instances
- **Tables:** 15+ instances (sections multiples)

---

**Version:** 1.0.0
**Dernière mise à jour :** 2026-01-30
