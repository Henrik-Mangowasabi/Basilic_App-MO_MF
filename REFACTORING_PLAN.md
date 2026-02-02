# 🚀 Plan de Refactoring - Basilic

> Plan d'amélioration pour réduire le code de 30-40% et améliorer la maintenabilité

---

## 📊 État actuel

- **5 routes principales** avec ~1,245 lignes de code dupliqué
- **Pattern repetition:** Loaders, actions, sélection, review status, tables
- **Maintenance difficile:** Modifications à répéter dans 5 fichiers
- **Tests limités:** Aucune suite de tests identifiée

---

## 🎯 Objectifs

1. ✅ **Réduire la duplication** de 30-40%
2. ✅ **Améliorer la maintenabilité** avec des composants réutilisables
3. ✅ **Simplifier les routes** en extrayant la logique
4. ✅ **Standardiser les patterns** pour cohérence
5. ✅ **Documenter** le code et les décisions

---

## 📋 Plan en 4 phases

### Phase 1: Hooks réutilisables (Priorité HAUTE) ⭐⭐⭐

**Temps estimé:** 1-2 jours
**Impact:** Réduction de ~200 lignes de code

#### 1.1 - Hook `useReviewStatus`

**Créer:** `app/hooks/useReviewStatus.ts`

```typescript
import { useSubmit, useRevalidator } from "react-router";

export function useReviewStatus() {
    const submit = useSubmit();
    const revalidator = useRevalidator();

    const setReviewStatus = (ids: string[], status: "to_review" | "reviewed") => {
        const fd = new FormData();
        fd.append("action", "set_review_status");
        fd.append("ids", JSON.stringify(ids));
        fd.append("status", status);
        submit(fd, { method: "post" });
    };

    const clearReviewStatus = (ids: string[]) => {
        const fd = new FormData();
        fd.append("action", "clear_review_status");
        fd.append("ids", JSON.stringify(ids));
        submit(fd, { method: "post" });
    };

    return { setReviewStatus, clearReviewStatus, revalidator };
}
```

**Utilisation dans les routes:**

```typescript
// Avant (dans chaque route)
const submit = useSubmit();
const handleReview = () => {
    const fd = new FormData();
    fd.append("action", "set_review_status");
    // ... 10 lignes
};

// Après
const { setReviewStatus } = useReviewStatus();
const handleReview = () => setReviewStatus(ids, "to_review");
```

**Fichiers à modifier:**
- `app/routes/app.mf.tsx:664`
- `app/routes/app.mo.tsx:574`
- `app/routes/app.templates.tsx:503`
- `app/routes/app.sections.tsx:455`
- `app/routes/app.menu.tsx:340`

---

#### 1.2 - Hook `useTableSelection`

**Créer:** `app/hooks/useTableSelection.ts`

```typescript
import { useState } from "react";

export function useTableSelection<T extends { id: string }>(initialKeys: Set<string> = new Set()) {
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(initialKeys);

    const handleSelectionChange = (sectionData: T[], keys: Set<string> | "all") => {
        if (keys === "all") {
            const newSet = new Set(selectedKeys);
            sectionData.forEach((d) => newSet.add(d.id));
            setSelectedKeys(newSet);
        } else {
            const currentTableIds = new Set(sectionData.map((d) => d.id));
            const otherIds = new Set([...selectedKeys].filter((id) => !currentTableIds.has(id)));
            const final = new Set([...otherIds, ...keys]);
            setSelectedKeys(final);
        }
    };

    const clearSelection = () => setSelectedKeys(new Set());

    return {
        selectedKeys,
        setSelectedKeys,
        handleSelectionChange,
        clearSelection
    };
}
```

**Utilisation:**

```typescript
// Avant
const [selectedKeys, setSelectedKeys] = useState(new Set());
const handleOnSelectionChange = (data, keys) => {
    // ... 15 lignes
};

// Après
const { selectedKeys, handleSelectionChange, clearSelection } = useTableSelection();
```

**Réduction:** ~100 lignes (20 lignes × 5 fichiers)

---

#### 1.3 - Hook `useNormSearch`

**Créer:** `app/hooks/useNormSearch.ts`

```typescript
import { useState, useMemo } from "react";

const normalize = (s: string) =>
    (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function useNormSearch<T>(
    items: T[],
    searchFields: (item: T) => string[]
) {
    const [search, setSearch] = useState("");

    const filteredItems = useMemo(() => {
        if (!search?.trim()) return items;
        const s = normalize(search.trim());
        return items.filter(item =>
            searchFields(item).some(field => normalize(field).includes(s))
        );
    }, [search, items, searchFields]);

    return { search, setSearch, filteredItems };
}
```

**Utilisation:**

```typescript
// Avant
const [search, setSearch] = useState("");
const norm = (s: string) => ...;
const filtered = useMemo(() => {
    // ... 10 lignes
}, [search, items]);

// Après
const { search, setSearch, filteredItems } = useNormSearch(
    items,
    (item) => [item.name, item.description]
);
```

**Réduction:** ~75 lignes (15 lignes × 5 fichiers)

---

### Phase 2: Composants UI réutilisables (Priorité HAUTE) ⭐⭐⭐

**Temps estimé:** 2-3 jours
**Impact:** Réduction de ~300 lignes + meilleure cohérence UI

#### 2.1 - Component `<SelectionActionBar>`

**Créer:** `app/components/SelectionActionBar.tsx`

```typescript
import { Button } from "@heroui/react";

interface SelectionActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onMarkToReview: () => void;
    onMarkReviewed: () => void;
    onClearReviewStatus: () => void;
    onDelete?: () => void; // Optionnel (seulement MF et MO)
    showDelete?: boolean;
}

export function SelectionActionBar({
    selectedCount,
    onClearSelection,
    onMarkToReview,
    onMarkReviewed,
    onClearReviewStatus,
    onDelete,
    showDelete = false
}: SelectionActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-2xl ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-[14px] font-medium text-white">
                        {selectedCount} sélectionnés
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="text-[#A1A1AA] hover:text-white transition-colors"
                        aria-label="Tout désélectionner"
                    >
                        <ClearIcon />
                    </button>
                </div>

                <div className="h-6 w-[1px] bg-[#3F3F46]"></div>

                <Button onPress={onMarkToReview} className="...">
                    À review
                </Button>
                <Button onPress={onMarkReviewed} className="...">
                    Review
                </Button>
                <Button onPress={onClearReviewStatus} variant="flat" className="...">
                    Réinitialiser
                </Button>
                {showDelete && onDelete && (
                    <Button onPress={onDelete} color="danger" className="...">
                        Supprimer
                    </Button>
                )}
            </div>
        </div>
    );
}
```

**Utilisation:**

```typescript
// Avant: ~50 lignes de JSX dans chaque route

// Après: 10 lignes
const { setReviewStatus, clearReviewStatus } = useReviewStatus();
const { selectedKeys, clearSelection } = useTableSelection();

<SelectionActionBar
    selectedCount={selectedKeys.size}
    onClearSelection={clearSelection}
    onMarkToReview={() => setReviewStatus(Array.from(selectedKeys), "to_review")}
    onMarkReviewed={() => setReviewStatus(Array.from(selectedKeys), "reviewed")}
    onClearReviewStatus={() => clearReviewStatus(Array.from(selectedKeys))}
    onDelete={handleDelete} // Seulement MF et MO
    showDelete={true} // Seulement MF et MO
/>
```

**Réduction:** ~200 lignes (40 lignes × 5 fichiers)

---

#### 2.2 - Component `<DataTable>`

**Créer:** `app/components/DataTable.tsx`

```typescript
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";

interface Column {
    key: string;
    label: string;
    align?: "start" | "center" | "end";
    className?: string;
}

interface DataTableProps<T> {
    columns: Column[];
    data: T[];
    selectedKeys: Set<string>;
    onSelectionChange: (keys: Set<string> | "all") => void;
    renderCell: (item: T, columnKey: React.Key) => React.ReactNode;
    getRowClassName?: (item: T) => string | undefined;
    emptyContent?: string;
    ariaLabel: string;
}

export function DataTable<T extends { id: string }>({
    columns,
    data,
    selectedKeys,
    onSelectionChange,
    renderCell,
    getRowClassName,
    emptyContent = "Aucune donnée trouvée.",
    ariaLabel
}: DataTableProps<T>) {
    return (
        <div className="mf-table__base">
            <Table
                aria-label={ariaLabel}
                removeWrapper
                selectionMode="multiple"
                selectionBehavior="checkbox"
                selectedKeys={selectedKeys}
                onSelectionChange={onSelectionChange}
                onRowAction={() => {}}
                className="mf-table mf-table--templates"
                classNames={{
                    th: "mf-table__header",
                    td: "mf-table__cell",
                    tr: "mf-table__row"
                }}
            >
                <TableHeader columns={columns}>
                    {(c) => (
                        <TableColumn
                            key={c.key}
                            align={c.align || "start"}
                            className={c.className}
                        >
                            {c.label}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody items={data} emptyContent={emptyContent}>
                    {(item: T) => (
                        <TableRow
                            key={item.id}
                            className={getRowClassName?.(item)}
                        >
                            {(columnKey) => (
                                <TableCell>
                                    {renderCell(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
```

**Utilisation:**

```typescript
// Avant: ~30 lignes de Table JSX

// Après: 10 lignes
<DataTable
    columns={columns}
    data={filteredData}
    selectedKeys={selectedKeys}
    onSelectionChange={handleSelectionChange}
    renderCell={renderCell}
    getRowClassName={(item) => reviewStatusMap?.[item.id] === "to_review" ? "mf-table__row--to-review" : undefined}
    ariaLabel="Liste des templates"
/>
```

**Réduction:** ~100 lignes (20 lignes × 5 fichiers)

---

#### 2.3 - Component `<SectionHeader>`

**Créer:** `app/components/SectionHeader.tsx`

```typescript
interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    count: number;
    isOpen: boolean;
    onToggle: () => void;
}

export function SectionHeader({ icon, title, count, isOpen, onToggle }: SectionHeaderProps) {
    return (
        <div
            className={`mf-section__header ${isOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`}
            onClick={onToggle}
        >
            <div className="mf-section__title-group">
                <span className="mf-section__icon">{icon}</span>
                <span className="mf-section__title">{title}</span>
                <span className="mf-section__count">{count}</span>
            </div>
            <span className={`mf-section__chevron ${isOpen ? 'mf-section__chevron--open' : ''}`}>
                <ChevronRightIcon />
            </span>
        </div>
    );
}
```

**Réduction:** ~50 lignes

---

### Phase 3: Utilitaires serveur (Priorité MOYENNE) ⭐⭐

**Temps estimé:** 1 jour
**Impact:** Consolidation de la logique serveur

#### 3.1 - Helper `reviewStatus.server.ts`

**Créer:** `app/utils/reviewStatus.server.ts`

```typescript
import type { PrismaClient } from "@prisma/client";

export type ReviewStatus = "to_review" | "reviewed";
export type ReviewSource = "mf" | "mo" | "templates" | "sections" | "menus";

export async function setReviewStatus(
    db: PrismaClient,
    shop: string,
    itemIds: string[],
    status: ReviewStatus,
    source: ReviewSource
) {
    for (const itemId of itemIds) {
        await db.itemReviewStatus.upsert({
            where: { shop_itemId_source: { shop, itemId, source } },
            create: { shop, itemId, status, source },
            update: { status }
        });
    }
}

export async function clearReviewStatus(
    db: PrismaClient,
    shop: string,
    itemIds: string[],
    source: ReviewSource
) {
    await db.itemReviewStatus.deleteMany({
        where: {
            shop,
            itemId: { in: itemIds },
            source
        }
    });
}

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
            rows.map((r) => [r.itemId, r.status as ReviewStatus])
        );
    } catch {
        return {};
    }
}
```

**Utilisation dans les loaders:**

```typescript
// Avant
let reviewStatusMap: Record<string, "to_review" | "reviewed"> = {};
try {
    const rows = await db.itemReviewStatus.findMany({...});
    // ... 5 lignes
} catch {}

// Après
const reviewStatusMap = await getReviewStatusMap(db, shop, "mf");
```

**Réduction:** ~150 lignes (30 lignes × 5 fichiers)

---

#### 3.2 - Factory `createRouteAction.ts`

**Créer:** `app/utils/createRouteAction.ts`

```typescript
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { setReviewStatus, clearReviewStatus, type ReviewSource } from "./reviewStatus.server";

interface RouteActionConfig {
    source: ReviewSource;
    handlers?: {
        update?: (formData: FormData, admin: any, shop: string) => Promise<any>;
        delete?: (formData: FormData, admin: any, shop: string) => Promise<any>;
        [key: string]: ((formData: FormData, admin: any, shop: string) => Promise<any>) | undefined;
    };
}

export function createRouteAction(config: RouteActionConfig) {
    return async ({ request }: { request: Request }) => {
        const { admin } = await authenticate.admin(request);
        const formData = await request.formData();
        const actionType = formData.get("action") as string;

        // Récupérer le shop
        const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
        const shopJson = await shopRes.json();
        const shop = shopJson.data?.shop?.myshopifyDomain;

        if (!shop) {
            return { ok: false, errors: [{ message: "Shop non trouvé" }] };
        }

        try {
            // Actions communes: review status
            if (actionType === "set_review_status") {
                const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];
                const status = formData.get("status") as "to_review" | "reviewed";

                if (!ids.length || !["to_review", "reviewed"].includes(status)) {
                    return { ok: false, errors: [{ message: "Paramètres invalides" }] };
                }

                await setReviewStatus(db, shop, ids, status, config.source);
                return { ok: true, action: "set_review_status" };
            }

            if (actionType === "clear_review_status") {
                const ids = JSON.parse((formData.get("ids") as string) || "[]") as string[];

                if (!ids.length) {
                    return { ok: false, errors: [{ message: "Aucun id" }] };
                }

                await clearReviewStatus(db, shop, ids, config.source);
                return { ok: true, action: "clear_review_status" };
            }

            // Actions custom
            if (config.handlers?.[actionType]) {
                return await config.handlers[actionType]!(formData, admin, shop);
            }

            return { ok: false, errors: [{ message: "Action inconnue" }] };
        } catch (e) {
            return {
                ok: false,
                errors: [{ message: "Base de données non prête." }]
            };
        }
    };
}
```

**Utilisation dans les routes:**

```typescript
// Avant: ~100 lignes d'action handler

// Après: 15 lignes
export const action = createRouteAction({
    source: "mf",
    handlers: {
        update: async (formData, admin, shop) => {
            // Logique spécifique à MF
            const id = formData.get("id");
            const name = formData.get("name");
            // ...
            return { ok: true };
        },
        delete: async (formData, admin, shop) => {
            // Logique spécifique à MF
            return { ok: true };
        }
    }
});
```

**Réduction:** ~250 lignes (50 lignes × 5 fichiers)

---

### Phase 4: Cell renderers library (Priorité BASSE) ⭐

**Temps estimé:** 1 jour
**Impact:** Meilleure cohérence, code plus lisible

#### 4.1 - Library `cellRenderers.tsx`

**Créer:** `app/components/cellRenderers.tsx`

```typescript
export const CellRenderers = {
    nameCell: (name: string, description?: string) => (
        <div className="mf-cell mf-cell--multi w-full mf-template-cell-no-select">
            <span className="mf-text--title">{name}</span>
            {description && <span className="mf-text--desc">{description}</span>}
        </div>
    ),

    countCell: (count: number, onClick?: () => void, variant: "success" | "danger" | "neutral" = "neutral") => {
        const colors = {
            success: "bg-[#4BB961]/10 text-[#15803D]",
            danger: "bg-[#F43F5E]/10 text-[#DC2626]",
            neutral: "bg-[#E4E4E7]/50 text-[#71717A]"
        };

        return (
            <div className="mf-cell mf-cell--center whitespace-nowrap w-full">
                <span
                    className={`mf-badge--count ${colors[variant]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    onClick={onClick}
                    role={onClick ? "button" : undefined}
                    tabIndex={onClick ? 0 : undefined}
                >
                    {count}
                </span>
            </div>
        );
    },

    dateCell: (date: string) => (
        <div className="mf-cell mf-cell--start w-full">
            <span className="text-[14px] text-[#71717A]">
                {new Date(date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                })}
            </span>
        </div>
    ),

    actionsCell: (children: React.ReactNode) => (
        <div className="mf-cell mf-cell--end w-full">
            {children}
        </div>
    )
};
```

**Utilisation:**

```typescript
// Avant
case "name":
    return (
        <div className="mf-cell mf-cell--multi">
            <span className="mf-text--title">{item.name}</span>
            <span className="mf-text--desc">{item.description}</span>
        </div>
    );

// Après
case "name":
    return CellRenderers.nameCell(item.name, item.description);
```

**Réduction:** ~250 lignes (50 lignes × 5 fichiers)

---

## 📊 Récapitulatif des gains

| Phase | Composant/Hook | Réduction de code | Amélioration maintenabilité |
|-------|----------------|-------------------|------------------------------|
| 1.1 | `useReviewStatus` | ~100 lignes | ⭐⭐⭐ |
| 1.2 | `useTableSelection` | ~100 lignes | ⭐⭐⭐ |
| 1.3 | `useNormSearch` | ~75 lignes | ⭐⭐ |
| 2.1 | `<SelectionActionBar>` | ~200 lignes | ⭐⭐⭐ |
| 2.2 | `<DataTable>` | ~100 lignes | ⭐⭐⭐ |
| 2.3 | `<SectionHeader>` | ~50 lignes | ⭐⭐ |
| 3.1 | `reviewStatus.server.ts` | ~150 lignes | ⭐⭐⭐ |
| 3.2 | `createRouteAction` | ~250 lignes | ⭐⭐⭐ |
| 4.1 | `cellRenderers` | ~250 lignes | ⭐⭐ |
| **TOTAL** | | **~1,275 lignes** | **Très haute** |

**Réduction totale:** ~**35-40%** du code dupliqué
**Temps total estimé:** 5-7 jours de développement

---

## 🗂️ Structure du projet après refactoring

```
app/
├── routes/
│   ├── app.mf.tsx (réduit de ~200 lignes)
│   ├── app.mo.tsx (réduit de ~200 lignes)
│   ├── app.templates.tsx (réduit de ~200 lignes)
│   ├── app.sections.tsx (réduit de ~200 lignes)
│   ├── app.menu.tsx (réduit de ~200 lignes)
│   └── app.api.*.tsx (inchangés)
├── components/
│   ├── BasilicUI.tsx (existant)
│   ├── ScanProvider.tsx (existant)
│   ├── SelectionActionBar.tsx (NOUVEAU) ⭐
│   ├── DataTable.tsx (NOUVEAU) ⭐
│   ├── SectionHeader.tsx (NOUVEAU) ⭐
│   └── cellRenderers.tsx (NOUVEAU)
├── hooks/
│   ├── useReviewStatus.ts (NOUVEAU) ⭐
│   ├── useTableSelection.ts (NOUVEAU) ⭐
│   └── useNormSearch.ts (NOUVEAU) ⭐
├── utils/
│   ├── graphql-helpers.server.ts (existant)
│   ├── cache.server.ts (existant)
│   ├── reviewStatus.server.ts (NOUVEAU) ⭐
│   └── createRouteAction.ts (NOUVEAU) ⭐
└── styles/
    └── metafields-table.css (existant)
```

---

## ✅ Checklist d'implémentation

### Phase 1: Hooks (1-2 jours)

- [ ] Créer `app/hooks/useReviewStatus.ts`
- [ ] Créer `app/hooks/useTableSelection.ts`
- [ ] Créer `app/hooks/useNormSearch.ts`
- [ ] Remplacer dans `app.mf.tsx`
- [ ] Remplacer dans `app.mo.tsx`
- [ ] Remplacer dans `app.templates.tsx`
- [ ] Remplacer dans `app.sections.tsx`
- [ ] Remplacer dans `app.menu.tsx`
- [ ] Tester chaque page

### Phase 2: Composants (2-3 jours)

- [ ] Créer `app/components/SelectionActionBar.tsx`
- [ ] Créer `app/components/DataTable.tsx`
- [ ] Créer `app/components/SectionHeader.tsx`
- [ ] Remplacer dans toutes les routes
- [ ] Tester l'UI et les interactions
- [ ] Vérifier la cohérence visuelle

### Phase 3: Utilitaires serveur (1 jour)

- [ ] Créer `app/utils/reviewStatus.server.ts`
- [ ] Créer `app/utils/createRouteAction.ts`
- [ ] Migrer les loaders
- [ ] Migrer les actions
- [ ] Tester les opérations DB

### Phase 4: Cell renderers (1 jour)

- [ ] Créer `app/components/cellRenderers.tsx`
- [ ] Remplacer dans `renderCell()` de chaque route
- [ ] Tester le rendu des cellules

### Documentation

- [ ] Mettre à jour `DOCUMENTATION.md`
- [ ] Mettre à jour `COMPONENTS.md`
- [ ] Ajouter des exemples d'utilisation
- [ ] Documenter les hooks et utilitaires

### Tests (optionnel)

- [ ] Ajouter tests unitaires pour hooks
- [ ] Ajouter tests de composants
- [ ] Ajouter tests d'intégration

---

## 🎯 Bénéfices attendus

### Code

- ✅ **-35% de lignes de code** (~1,275 lignes)
- ✅ **DRY principle** appliqué
- ✅ **Single responsibility** pour chaque composant
- ✅ **Separation of concerns** claire

### Maintenabilité

- ✅ **1 endroit** pour modifier la logique de review (vs 5)
- ✅ **1 composant** pour l'action bar (vs 5)
- ✅ **1 hook** pour la sélection (vs 5)
- ✅ **Tests** plus faciles à écrire

### Performance

- ✅ **Memoization** optimisée dans les hooks
- ✅ **Bundle size** réduit
- ✅ **Re-renders** minimisés

### Développement

- ✅ **Onboarding** plus rapide (code plus simple)
- ✅ **Features** plus rapides à implémenter
- ✅ **Bugs** plus faciles à identifier et corriger

---

## 🚨 Risques et mitigation

### Risque 1: Breaking changes

**Mitigation:**
- Implémenter phase par phase
- Tester après chaque modification
- Garder les anciennes versions commentées temporairement

### Risque 2: Régression UI

**Mitigation:**
- Screenshots avant/après
- Tests visuels
- Validation utilisateur

### Risque 3: Perte de fonctionnalités

**Mitigation:**
- Checklist de tests manuels
- Tests automatisés (recommandé)
- Review code approfondie

---

## 📈 Prochaines étapes recommandées

### Après le refactoring

1. **Tests automatisés**
   - Vitest pour les hooks et utilitaires
   - Playwright pour les tests E2E

2. **Performance monitoring**
   - Lighthouse CI
   - Bundle analyzer

3. **Documentation continue**
   - Storybook pour les composants
   - JSDoc pour les fonctions

4. **CI/CD**
   - GitHub Actions
   - Tests automatiques sur PR
   - Déploiement automatique

---

**Version:** 1.0.0
**Auteur:** Claude Code
**Date:** 2026-01-30
