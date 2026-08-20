# Phase 3: Patron Browse Experience - Pattern Map

**Mapped:** 2026-08-12
**Files analyzed:** 13 new files + 5 modified files
**Analogs found:** 12 / 18 (67% with direct analogs; 5 no-analog cases use patterns from RESEARCH.md)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/patron/src/main.tsx` | utility | request-response | `apps/barback/src/main.tsx` | exact |
| `apps/patron/src/App.tsx` | component | request-response | `apps/barback/src/App.tsx` | exact |
| `apps/patron/src/api/useRecipes.ts` | service | request-response | `apps/barback/src/api/useRecipes.ts` | exact |
| `apps/patron/src/api/useRecipeDetail.ts` | service | request-response | `apps/barback/src/api/useRecipes.ts` | role-match |
| `apps/patron/src/api/useTags.ts` | service | request-response | `apps/barback/src/api/useRecipes.ts` | role-match |
| `apps/patron/src/api/socket.ts` | service | event-driven | (no analog — Socket.IO new) | no-match |
| `apps/patron/src/components/RecipeBrowse.tsx` | component | request-response | `apps/barback/src/components/RecipesTab.tsx` | role-match |
| `apps/patron/src/components/RecipeCard.tsx` | component | request-response | `apps/barback/src/components/RecipeRow.tsx` | role-match |
| `apps/patron/src/components/RecipeDetail.tsx` | component | request-response | `apps/barback/src/components/views/RecipeDetailView.tsx` | role-match |
| `apps/patron/src/components/TagRail.tsx` | component | request-response | `apps/barback/src/components/pickers/CategoryPicker.tsx` | partial |
| `apps/patron/src/components/TagSubmenu.tsx` | component | request-response | `apps/barback/src/components/pickers/CategoryPicker.tsx` | partial |
| `apps/patron/src/components/MakeableIndicator.tsx` | component | request-response | `apps/barback/src/components/MakeableStatusBadge.tsx` | exact |
| `apps/patron/src/types/index.ts` | model | N/A | `packages/shared/src/recipe.ts` | role-match |
| `apps/server/src/db/schema.ts` (modify) | model | N/A | `apps/server/src/db/schema.ts` (existing) | same-file |
| `apps/server/src/routes/recipes.ts` (extend) | route | CRUD | `apps/server/src/routes/recipes.ts` (existing) | same-file |
| `apps/server/src/routes/tags.ts` (new) | route | CRUD | `apps/server/src/routes/categories.ts` | role-match |
| `apps/server/src/index.ts` (extend) | utility | event-driven | `apps/server/src/index.ts` (existing) | same-file |
| `apps/barback/src/components/views/AddEditRecipeView.tsx` (extend) | component | request-response | (same file) | same-file |
| `packages/shared/src/recipe.ts` (extend) | model | N/A | (same file) | same-file |

---

## Pattern Assignments

### `apps/patron/src/main.tsx` (utility, request-response)

**Analog:** `apps/barback/src/main.tsx`

**Pattern:** React entry point with TanStack Query provider initialization

**Code** (lines 1-15):
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.js'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

**Apply to:** Patron app entry point. Patron also needs to pass `queryClient` to Socket.IO init (see socket.ts pattern below).

---

### `apps/patron/src/App.tsx` (component, request-response)

**Analog:** `apps/barback/src/App.tsx`

**Pattern:** Root layout component with Tailwind classes, dark theme setup

**Key excerpt** (lines 40-60):
```typescript
<div className="h-dvh overflow-hidden flex flex-col bg-bar-bg">
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* Tab content goes here */}
  </div>
  {/* Fixed footer/nav component */}
</div>
```

**Patron difference:** No antd ConfigProvider or tabs needed (guest-facing kiosk, single browse view). Use Tailwind only for dark-neon aesthetic per UI-SPEC.md. Structure is simpler: App → TagRail (left sidebar) + RecipeBrowse (main content).

---

### `apps/patron/src/api/useRecipes.ts` (service, request-response)

**Analog:** `apps/barback/src/api/useRecipes.ts`

**Pattern:** TanStack Query hook for GET /api/recipes

**Code** (lines 16-21):
```typescript
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
  })
}
```

**Patron modification for Phase 3:**
- Use same pattern but add `staleTime: Infinity` (per RESEARCH.md Pattern 1) so Socket.IO invalidation controls freshness, not time-based staleness.
- Response now includes `tags` array (D-33) and `description` field (D-40), handled transparently via updated Recipe type from `@my-bar/shared`.

**Code:**
```typescript
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
    staleTime: Infinity,  // Trust Socket.IO pushes, not time-based staleness
    gcTime: 1000 * 60 * 10,  // Keep cached for 10 min after unmount
  })
}
```

---

### `apps/patron/src/api/useRecipeDetail.ts` (service, request-response)

**Analog:** `apps/barback/src/api/useRecipes.ts` (extract pattern)

**Pattern:** TanStack Query hook for single-item fetch with ID parameter

**Code:**
```typescript
import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', recipeId],
    queryFn: () => apiFetch<Recipe>(`/recipes/${recipeId}`),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  })
}
```

**Apply to:** Detail view component. Keyed as `['recipes', recipeId]` so Socket.IO events can invalidate individual recipes or the whole list.

---

### `apps/patron/src/api/useTags.ts` (service, request-response)

**Analog:** `apps/barback/src/api/useRecipes.ts` (template)

**Pattern:** TanStack Query hook for fetching tags

**Code:**
```typescript
import { useQuery } from '@tanstack/react-query'
import type { Tag } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<Tag[]>('/tags'),
    staleTime: Infinity,
  })
}

// Optional: fetch only active tags (D-36)
export function useTagsActive() {
  return useQuery({
    queryKey: ['tags', 'active'],
    queryFn: () => apiFetch<Tag[]>('/tags/active'),
    staleTime: Infinity,
  })
}
```

**Apply to:** TagRail component to populate submenu (D-36).

---

### `apps/patron/src/api/socket.ts` (service, event-driven)

**Analog:** RESEARCH.md Pattern 1 (Socket.IO + TanStack Query integration)

**Pattern:** Socket.IO client initialization with TanStack Query invalidation hooks

**Code** (from RESEARCH.md section "Socket.IO + TanStack Query Integration"):
```typescript
import { io, Socket } from 'socket.io-client'
import { QueryClient } from '@tanstack/react-query'

export function initSocket(queryClient: QueryClient): Socket {
  const socket = io(`${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}`, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  })

  // Inventory changed on Barback — invalidate all cached recipes
  socket.on('inventory:changed', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  // Recipe edited (tags, description) — invalidate specific recipe or all
  socket.on('recipe:updated', (recipeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['recipes', recipeId] })
    // Also invalidate the list since tag counts may have changed
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  // On reconnect after network blip, re-sync full state (Pitfall 4 mitigation)
  socket.on('connect', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
  })

  return socket
}
```

**Integration point:** Call `initSocket(queryClient)` in `main.tsx` after `const queryClient = new QueryClient()` and before mounting App.

---

### `apps/patron/src/components/RecipeBrowse.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/RecipesTab.tsx` (container logic)

**Pattern:** Tab/view container managing multiple view states (list vs detail)

**Key excerpt from analog** (lines 54-80):
```typescript
export function RecipesTab() {
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list')
  const [editing, setEditing] = useState<Recipe>()
  const [viewing, setViewing] = useState<Recipe>()

  function openAdd() { setView('add'); setEditing(undefined) }
  function openEdit(recipe: Recipe) { setEditing(recipe); setView('add') }
  function openDetail(recipe: Recipe) { setViewing(recipe); setView('detail') }

  if (view === 'add') {
    return <AddEditRecipeView recipe={editing} onBack={() => setView('list')} />
  }
  if (view === 'detail' && viewing) {
    return <RecipeDetailView recipe={viewing} onBack={() => setView('list')} />
  }
  // Default: render list
  return <RecipeList ... />
}
```

**Patron adaptation for RecipeBrowse:**
```typescript
export function RecipeBrowse() {
  const [view, setView] = useState<'grid' | 'detail'>('grid')
  const [viewing, setViewing] = useState<Recipe>()
  const [selectedTagId, setSelectedTagId] = useState<string>()

  // Patron is browse-only, no add/edit (Phase 4 adds ordering)
  function openDetail(recipe: Recipe) { setViewing(recipe); setView('detail') }

  if (view === 'detail' && viewing) {
    return <RecipeDetail recipe={viewing} onBack={() => setView('grid')} />
  }
  return (
    <div className="flex gap-xl p-xl">
      <TagRail onSelectTag={setSelectedTagId} />
      <RecipeGrid selectedTagId={selectedTagId} onSelectRecipe={openDetail} />
    </div>
  )
}
```

**Key difference from Barback:** No add/edit views (browsing only per PATR-06). Grid layout with left-side TagRail instead of tabs.

---

### `apps/patron/src/components/RecipeCard.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/RecipeRow.tsx` (single recipe display)

**Pattern:** Single item display component with interactive callback

**Barback RecipeRow pattern (lines 1-40, conceptual):**
- Receives recipe prop
- Renders recipe.name as primary text
- Shows status badge via separate component
- Has onEdit/onView callbacks
- Uses antd Button + styling

**Patron adaptation for RecipeCard:**
- Receives recipe prop with tags (new D-33) and description (D-40)
- Renders name, tags as tag-triplet (D-38), makeable indicator badge (D-43)
- No antd components (Tailwind only for dark-neon guest aesthetic)
- onClick handler calls parent's onViewDetail callback
- Dimmed/desaturated if not makeable (D-43)

**Code sketch:**
```typescript
interface RecipeCardProps {
  recipe: Recipe
  onViewDetail: (recipe: Recipe) => void
}

export function RecipeCard({ recipe, onViewDetail }: RecipeCardProps) {
  const isAvailable = recipe.overallStatus === 'green'
  
  return (
    <div
      className={`cursor-pointer p-md rounded border-neon ${
        isAvailable ? 'opacity-100' : 'opacity-60 grayscale'
      }`}
      onClick={() => onViewDetail(recipe)}
    >
      <h3 className="text-heading font-semibold text-white">{recipe.name}</h3>
      
      {/* Tag triplet (D-38) */}
      <div className="flex gap-xs mt-xs">
        {recipe.tags.slice(0, 3).map(tag => (
          <span key={tag.id} className="text-label bg-accent px-xs py-xs rounded">
            {tag.name}
          </span>
        ))}
      </div>

      {/* Makeable indicator badge (D-38, D-43) */}
      <div className="mt-md">
        <MakeableIndicator status={recipe.overallStatus} />
      </div>
    </div>
  )
}
```

---

### `apps/patron/src/components/RecipeDetail.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/views/RecipeDetailView.tsx`

**Pattern:** Full-screen detail view with header + scrollable content + back button

**Barback pattern (conceptual):**
- Receives recipe prop
- Renders FullScreenHeader with back button (from 260812-m0i quick task)
- Displays recipe info in scrollable main area
- Uses Tab + other antd components for layout

**Patron adaptation for RecipeDetail:**
- Uses FullScreenHeader for consistency (D-41 mentions this pattern from 260812-m0i)
- Displays: drink name (D-39), tags, ingredient names (flat list, no roles per D-39), description if non-empty (D-40), missing ingredients if not-makeable (D-44)
- Placeholder image hero slot (D-41)
- Makeable indicator badge (same as card, D-39)
- No form fields (browse-only per PATR-06)
- Dark-neon Tailwind styling, no antd

**Code sketch:**
```typescript
interface RecipeDetailProps {
  recipe: Recipe
  onBack: () => void
}

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  return (
    <div className="flex flex-col h-dvh bg-bar-bg">
      <FullScreenHeader onBack={onBack} title={recipe.name} />
      
      <main className="flex-1 overflow-y-auto px-xl py-lg">
        {/* Placeholder hero image (D-41) */}
        <div className="h-56 bg-gradient-to-br from-accent/20 to-transparent rounded mb-lg">
          {/* Cocktail silhouette or placeholder */}
        </div>

        {/* Name + Tags */}
        <h1 className="text-display font-semibold text-white mb-md">{recipe.name}</h1>
        <div className="flex gap-xs mb-lg">
          {recipe.tags.map(tag => (
            <span key={tag.id} className="text-label bg-accent px-xs py-xs rounded">
              {tag.name}
            </span>
          ))}
        </div>

        {/* Makeable indicator (D-39, D-42) */}
        <MakeableIndicator status={recipe.overallStatus} />

        {/* Ingredients flat list (D-39) */}
        <section className="mt-lg">
          <h2 className="text-heading font-semibold text-white mb-md">Ingredients</h2>
          <ul className="space-y-xs">
            {recipe.ingredients.map(ing => (
              <li key={ing.id} className="text-body text-gray-300">
                {ing.ingredientName ? `${ing.quantity} ${ing.unit} ${ing.ingredientName}` : `${ing.quantity} ${ing.unit} (${ing.categoryName})`}
              </li>
            ))}
          </ul>
        </section>

        {/* Missing ingredients detail (D-44, only on detail, only if not-makeable) */}
        {recipe.overallStatus !== 'green' && recipe.missingCategoryNames.length > 0 && (
          <section className="mt-lg p-md bg-red-500/10 rounded border border-red-500/20">
            <p className="text-body text-red-300">Missing: {recipe.missingCategoryNames.join(', ')}</p>
          </section>
        )}

        {/* Description/story (D-39, only if non-empty) */}
        {recipe.description && (
          <section className="mt-lg">
            <h3 className="text-heading font-semibold text-accent mb-md">Story</h3>
            <p className="text-body text-gray-300 leading-relaxed">{recipe.description}</p>
          </section>
        )}
      </main>
    </div>
  )
}
```

---

### `apps/patron/src/components/TagRail.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/pickers/CategoryPicker.tsx` (filtering/selection logic)

**Pattern:** Interactive selector with dynamic option list and state management

**Patron adaptation for TagRail (D-33/D-36):**
- Left-side vertical rail with icon buttons (one per tag group: Spirit/Type/Season/Flavor)
- Tapping a group icon expands a submenu showing that group's tags
- Only show tags that have ≥1 recipe (D-36, active-tags filtering)
- Single-select: tapping a new tag replaces the active filter (D-37)
- Icons from Lucide (Wine2, Sparkles, Leaf, Flame per UI-SPEC.md)

**Code sketch:**
```typescript
interface TagRailProps {
  onSelectTag: (tagId: string | undefined) => void
  selectedTagId?: string
}

const TAG_GROUPS = [
  { id: 'spirit', label: 'Spirit', icon: Wine2 },
  { id: 'type', label: 'Type', icon: Sparkles },
  { id: 'season', label: 'Season', icon: Leaf },
  { id: 'flavor', label: 'Flavor', icon: Flame },
] as const

export function TagRail({ onSelectTag, selectedTagId }: TagRailProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string>()
  const { data: tags = [] } = useTags()

  // Filter tags to active only (D-36)
  const activeTags = useMemo(() => {
    const { data: recipes = [] } = useRecipes()
    const activeIds = new Set<string>()
    recipes.forEach(r => r.tags.forEach(t => activeIds.add(t.id)))
    return tags.filter(t => activeIds.has(t.id))
  }, [tags])

  return (
    <div className="flex flex-col gap-md">
      {TAG_GROUPS.map(group => (
        <TagRailGroup
          key={group.id}
          group={group}
          tags={activeTags.filter(t => t.group === group.id)}
          expanded={expandedGroupId === group.id}
          onExpand={() => setExpandedGroupId(expandedGroupId === group.id ? undefined : group.id)}
          onSelectTag={onSelectTag}
          selectedTagId={selectedTagId}
        />
      ))}
    </div>
  )
}
```

---

### `apps/patron/src/components/TagSubmenu.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/pickers/CategoryPicker.tsx` (option list + selection)

**Pattern:** Expandable dropdown with list of selectable items

**Code sketch:**
```typescript
interface TagSubmenuProps {
  group: TagGroup
  tags: Tag[]
  onSelectTag: (tagId: string) => void
  selectedTagId?: string
  expanded?: boolean
}

export function TagSubmenu({ group, tags, onSelectTag, selectedTagId, expanded }: TagSubmenuProps) {
  if (!expanded) return null

  return (
    <div className="pl-md border-l border-accent/50 space-y-xs">
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(tag.id)}
          className={`block text-label px-xs py-xs rounded ${
            selectedTagId === tag.id ? 'bg-accent text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
```

---

### `apps/patron/src/components/MakeableIndicator.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/MakeableStatusBadge.tsx`

**Pattern:** Display-layer collapse of tri-state status to 2-state per D-42

**Barback code** (lines 14-36):
```typescript
export function MakeableStatusBadge({ status }: MakeableStatusBadgeProps) {
  if (status === 'green') {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Ready to make
      </Tag>
    )
  }
  if (status === 'yellow') {
    return (
      <Tag icon={<WarningOutlined />} color="warning">
        Substitution needed
      </Tag>
    )
  }
  return (
    <Tag icon={<CloseCircleOutlined />} color="error">
      Missing ingredients
    </Tag>
  )
}
```

**Patron adaptation for MakeableIndicator (D-42 collapse):**
- Collapse yellow/red → "Not Available"
- Use Tailwind instead of antd (dark-neon aesthetic)
- No icon (simple badge text only per D-38/D-39)
- Success color #10b981 (green), Destructive color #ef4444 (red)

**Code:**
```typescript
import type { TriStateStatus } from '@my-bar/shared'

interface MakeableIndicatorProps {
  status: TriStateStatus  // 'green' | 'yellow' | 'red' from backend
  showText?: boolean
}

export function MakeableIndicator({ status, showText = true }: MakeableIndicatorProps) {
  // D-42: collapse yellow/red to "not available"
  const isAvailable = status === 'green'
  const label = isAvailable ? 'Available' : 'Not Available'
  const className = isAvailable
    ? 'bg-green-500 text-white'
    : 'bg-red-500 text-white'

  return (
    <div className={`px-md py-xs rounded font-semibold text-sm ${className}`}>
      {showText && label}
    </div>
  )
}
```

---

### `apps/patron/src/types/index.ts` (model)

**Analog:** `packages/shared/src/recipe.ts`

**Pattern:** Type extensions for Patron-specific needs

**Code:**
```typescript
import type { Recipe, Tag } from '@my-bar/shared'

// Patron-specific types may extend shared types
// For now, simply re-export shared types
export type { Recipe, Tag }
```

**Note:** All Patron types come from `@my-bar/shared` (Recipe, Tag, etc.). This file exists as a placeholder for future Patron-specific extensions.

---

### `apps/server/src/db/schema.ts` (modify, model)

**Analog:** Existing `apps/server/src/db/schema.ts` (lines 1-78)

**Pattern:** Drizzle table definitions with foreign keys and constraints

**Additions needed:**
1. New `tags` table (D-33/D-34: fixed taxonomy, four groups)
2. New `recipeTags` junction table (many-to-many)
3. New `description` column on `recipes` table (D-40)

**Code to add** (from RESEARCH.md Data Model section):
```typescript
// D-33/D-34: fixed tag taxonomy — four groups (spirit, type, season, flavor)
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  group: text('group', {
    enum: ['spirit', 'type', 'season', 'flavor']
  }).notNull(),
  disabled: integer('disabled', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  uniqueGroupName: unique().on(table.group, table.name),
}))

// Recipe ↔ Tag many-to-many (D-33)
export const recipeTags = sqliteTable('recipe_tags', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'restrict' }),
}, (table) => ({
  unique: unique().on(table.recipeId, table.tagId),
}))

// Extend recipes table with description (D-40)
// Add to existing recipes table definition:
description: text('description'),   // NEW — free text, optional, nullable
```

**Integration:** Modify the existing `recipes` table definition to include the description column. Add the two new tables (tags, recipeTags) to the schema file.

---

### `apps/server/src/routes/recipes.ts` (extend, route CRUD)

**Analog:** Existing `apps/server/src/routes/recipes.ts` (lines 1-100, loadRecipe function)

**Pattern:** Fastify route with Drizzle ORM queries, Zod validation, tagged response

**Modifications needed:**

1. **loadRecipe() function:** Add tags join to fetch tags from recipeTags/tags tables
2. **Response schemas:** Extend recipe response to include tags array + description field
3. **POST/PATCH handlers:** Accept tagIds array in request body, update recipeTags junction table
4. **GET routes:** Ensure tags and description are included in both /api/recipes and /api/recipes/:id responses

**Code snippet for loadRecipe() tags-join addition:**
```typescript
// After loading main recipe row and ingredientRows (existing code),
// add tags join:
const tagRows = db
  .select({
    id: tags.id,
    name: tags.name,
    group: tags.group,
  })
  .from(recipeTags)
  .innerJoin(tags, eq(recipeTags.tagId, tags.id))
  .where(eq(recipeTags.recipeId, recipeId))
  .all()

// Include in response mapping:
const tagsResponse = tagRows.map(r => ({
  id: r.id,
  name: r.name,
  group: r.group,
}))
```

**Code snippet for PATCH handler tagIds handling:**
```typescript
// In the PATCH /api/recipes/:id handler, after updating the recipe row:
if (request.body.tagIds !== undefined) {
  // Delete existing tags for this recipe
  db.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId)).run()
  
  // Insert new tags
  for (const tagId of request.body.tagIds) {
    db.insert(recipeTags).values({
      id: crypto.randomUUID(),
      recipeId,
      tagId,
    }).run()
  }
}
```

---

### `apps/server/src/routes/tags.ts` (new, route CRUD)

**Analog:** `apps/server/src/routes/categories.ts` (lines 1-100)

**Pattern:** Fastify plugin with GET routes for curated resources, Zod response schemas

**Code structure from categories.ts to adapt:**
```typescript
import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Tag } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { tags } from '../db/schema.js'

interface TagsRoutesOptions extends FastifyPluginOptions {
  db?: typeof defaultDb
}

export const tagsRoutes: FastifyPluginAsync<TagsRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  // GET /api/tags — return all tags grouped by type
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(z.object({
            id: z.string().uuid(),
            name: z.string(),
            group: z.enum(['spirit', 'type', 'season', 'flavor']),
          })),
        },
      },
    },
    async () => {
      return db.select().from(tags).where(eq(tags.disabled, false)).orderBy(asc(tags.group), asc(tags.name)).all()
    },
  )

  // GET /api/tags/active — return tags with ≥1 recipe (D-36, optional server-side computation)
  app.withTypeProvider<ZodTypeProvider>().get(
    '/active',
    {
      schema: {
        response: {
          200: z.array(z.object({
            id: z.string().uuid(),
            name: z.string(),
            group: z.enum(['spirit', 'type', 'season', 'flavor']),
          })),
        },
      },
    },
    async () => {
      // Query: tags that have at least one recipe
      const activeTags = db
        .selectDistinct({ 
          id: tags.id, 
          name: tags.name, 
          group: tags.group 
        })
        .from(tags)
        .innerJoin(recipeTags, eq(tags.id, recipeTags.tagId))
        .where(eq(tags.disabled, false))
        .orderBy(asc(tags.group), asc(tags.name))
        .all()
      return activeTags
    },
  )
}
```

**Integration:** Register in `apps/server/src/index.ts` as:
```typescript
app.register(tagsRoutes, { prefix: '/api/tags' })
```

---

### `apps/server/src/index.ts` (extend, utility event-driven)

**Analog:** Existing `apps/server/src/index.ts` (lines 1-55)

**Pattern:** Fastify plugin registration + Socket.IO initialization

**Modifications needed:**

1. Import Socket.IO and register it
2. Attach event listeners from routes that mutate state
3. Broadcast events to connected clients

**Code additions:**
```typescript
import { Server as SocketIOServer } from 'socket.io'

export function buildApp() {
  const app = Fastify({ logger: true })

  // ... existing setup code ...

  // Initialize Socket.IO server
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: process.env.NODE_ENV !== 'production' 
        ? ['http://localhost:5173'] 
        : undefined,
    },
  })

  // Store io on app context for routes to emit events
  app.decorate('io', io)

  // ... register existing routes ...

  // Routes that mutate state will call app.io.emit(...) to broadcast updates
  // Example: in ingredients.ts PATCH stock handler, after updating:
  // app.io.emit('inventory:changed', { recipesAffected: [...] })

  return app
}
```

**Integration:** Modify ingredient/recipe route handlers to emit events:
- After ingredient stock update: emit `inventory:changed`
- After recipe edit (tags/description): emit `recipe:updated`

---

### `apps/barback/src/components/views/AddEditRecipeView.tsx` (extend, component)

**Analog:** Same file (extends existing form)

**Pattern:** antd Form with new field components added to existing layout

**Modifications:** Add two new Form.Item fields (from RESEARCH.md and D-40/D-33):

1. **Description field** (D-40 — optional, free text, after garnish)
2. **Tag picker** (D-33/D-34 — multi-select from fixed taxonomy, after ingredients)

**Code additions to existing form** (around line 114-130):
```typescript
{/* NEW: Description field (D-40), optional, after garnish */}
<Form.Item name="description" label="Description/Story">
  <Input.TextArea 
    placeholder="e.g. A smooth, sippable classic..." 
    maxLength={2000}
    rows={4}
  />
</Form.Item>

{/* NEW: Tag picker (D-33), multi-select, after ingredients */}
<Form.Item name="tagIds" label="Tags">
  <TagPicker />
</Form.Item>
```

**Create new component `apps/barback/src/components/pickers/TagPicker.tsx`:**
- Similar pattern to CategoryPicker (lines 1-92 of CategoryPicker.tsx)
- Show four tag groups vertically (Spirit, Type, Season, Flavor)
- Allow multi-select: can pick any number of tags across groups
- Display as tag pills/chips showing selected tags
- Read-only (owner cannot create new tags this phase per D-35)

**Code sketch:**
```typescript
import { Select } from 'antd'
import type { Tag } from '@my-bar/shared'
import { useTags } from '../../api/useTags.js'

interface TagPickerProps {
  value?: string[]
  onChange?: (tagIds: string[]) => void
}

export function TagPicker({ value, onChange }: TagPickerProps) {
  const { data: tags = [] } = useTags()

  // Group tags by group for optgroup rendering
  const groupedOptions = [
    { label: 'Spirit', options: tags.filter(t => t.group === 'spirit').map(t => ({ label: t.name, value: t.id })) },
    { label: 'Type', options: tags.filter(t => t.group === 'type').map(t => ({ label: t.name, value: t.id })) },
    // ... etc for season and flavor
  ].filter(g => g.options.length > 0)

  return (
    <Select
      mode="multiple"
      placeholder="Select tags"
      value={value}
      onChange={onChange}
      optionLabelProp="label"
      options={groupedOptions}
    />
  )
}
```

**Update AddEditRecipeView form initialization** (around line 62-74) to include description and tagIds:
```typescript
useEffect(() => {
  if (recipe) {
    form.setFieldsValue({
      name: recipe.name,
      ingredients: recipe.ingredients.map((ing) => ({...})),
      method: recipe.method,
      glasswareId: recipe.glasswareId ?? undefined,
      garnish: recipe.garnish ?? undefined,
      description: recipe.description ?? undefined,        // NEW
      tagIds: recipe.tags.map(t => t.id) ?? undefined,    // NEW
    })
  } else {
    form.resetFields()
  }
}, [recipe, form])
```

**Update RecipeInput schema validation** (in shared/src/recipe.ts) to accept tagIds and description in the API request.

---

### `packages/shared/src/recipe.ts` (extend, model)

**Analog:** Same file (extend existing Zod schemas)

**Pattern:** Zod schema extension with new fields

**Modifications needed:**

1. **Create Tag type** (new, for frontend consumption):
```typescript
export const tag = z.object({
  id: z.string().uuid(),
  name: z.string(),
  group: z.enum(['spirit', 'type', 'season', 'flavor']),
})
export type Tag = z.infer<typeof tag>
```

2. **Extend recipeInput** (line 30-36) to include description + tagIds:
```typescript
export const recipeInput = z.object({
  name: z.string().trim().min(1).max(200),
  ingredients: z.array(recipeIngredientInput).min(1),
  method: z.array(z.string().trim().min(1).max(500)).min(1),
  glasswareId: z.string().uuid().optional(),
  garnish: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),    // NEW (D-40)
  tagIds: z.array(z.string().uuid()).optional(),           // NEW (D-33)
})
```

3. **Extend recipe response** (line 64-77) to include tags array + description:
```typescript
export const recipe = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(recipeIngredient),
  method: z.array(z.string()),
  glasswareId: z.string().uuid().nullable(),
  glasswareName: z.string().nullable(),
  garnish: z.string().nullable(),
  description: z.string().nullable(),        // NEW (D-40)
  tags: z.array(tag),                        // NEW (D-33)
  overallStatus: triStateStatus,
  missingCategoryIds: z.array(z.string().uuid()),
  missingCategoryNames: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
```

4. **Update recipePatch** (line 83-88) to accept same fields:
```typescript
export const recipePatch = recipeInput
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
```

---

## Shared Patterns

### TanStack Query Hook Pattern

**Source:** `apps/barback/src/api/useRecipes.ts`

**Apply to:** All Patron fetch hooks (`useRecipes.ts`, `useRecipeDetail.ts`, `useTags.ts`)

**Pattern:**
```typescript
import { useQuery } from '@tanstack/react-query'
import type { T } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useXxx() {
  return useQuery({
    queryKey: ['xxx'],
    queryFn: () => apiFetch<T>('/xxx'),
    staleTime: Infinity,  // Trust Socket.IO for freshness, not time
    gcTime: 1000 * 60 * 10,  // 10-min cache after unmount
  })
}
```

**Key point:** Set `staleTime: Infinity` so Socket.IO `invalidateQueries()` calls (not time-based staleness) control when data is re-fetched. This ensures Patron always sees the server's current authoritative state.

---

### API Fetch Client Pattern

**Source:** `apps/barback/src/api/client.ts`

**Apply to:** Patron's `apps/patron/src/api/client.ts` (copy verbatim)

**Pattern:**
```typescript
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request to ${path} failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
```

---

### Socket.IO + TanStack Query Invalidation Pattern

**Source:** RESEARCH.md Pattern 1 (Pitfall 4 mitigation)

**Apply to:** `apps/patron/src/api/socket.ts`

**Critical pattern:**
```typescript
socket.on('connect', () => {
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
  queryClient.invalidateQueries({ queryKey: ['tags'] })
})
```

**Why:** On reconnect after network blip (e.g., iPad wake, WiFi roam), explicitly re-sync the full recipes list. Without this, missed `inventory:changed` events during disconnect stay missed, leaving the client with stale makeable status. This is Pitfall 4 mitigation.

---

### Tri-State Makeable Collapse Pattern (D-42)

**Source:** `apps/barback/src/components/MakeableStatusBadge.tsx` + RESEARCH.md Pattern 2

**Apply to:** `apps/patron/src/components/MakeableIndicator.tsx`

**Pattern:**
```typescript
const isAvailable = status === 'green'
// yellow/red both become "Not Available"
return isAvailable ? 'Available' : 'Not Available'
```

**Key point:** The collapse is display-layer only. Backend still computes and returns full tri-state; Patron just hides yellow from the guest and renders it the same as red. No backend change needed.

---

### Active Tags Filtering Pattern (D-36)

**Source:** RESEARCH.md Pattern 3

**Apply to:** `apps/patron/src/components/TagRail.tsx`

**Pattern:**
```typescript
const activeTags = useMemo(() => {
  if (!recipes) return new Set<string>()
  const ids = new Set<string>()
  recipes.forEach(r => r.tags.forEach(t => ids.add(t.id)))
  return ids
}, [recipes])

// Only render tags that exist in activeTags set
```

**Key point:** Never show a tag to the patron that would produce an empty result (D-36). Filter dynamically from the recipes list; re-compute whenever recipes change via TanStack Query.

---

### Fastify Route Pattern with Zod Validation

**Source:** `apps/server/src/routes/categories.ts` (lines 31-49)

**Apply to:** New `apps/server/src/routes/tags.ts` and extensions to `routes/recipes.ts`

**Pattern:**
```typescript
export const xxxRoutes: FastifyPluginAsync<XxxRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: { 200: z.array(xxx) },
      },
    },
    async () => {
      return db.select().from(xxxTable).all()
    },
  )
}
```

---

### Drizzle ORM Foreign Key Pattern

**Source:** `apps/server/src/db/schema.ts` (lines 56-77, recipeIngredients table)

**Apply to:** New `recipeTags` table in schema.ts

**Pattern:**
```typescript
export const recipeTags = sqliteTable('recipe_tags', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'restrict' }),
}, (table) => ({
  unique: unique().on(table.recipeId, table.tagId),
}))
```

**Key decisions:**
- Recipe deletion cascades to its tags (a recipe without tags is fine)
- Tag deletion is restricted (can't delete a tag in use; must reassign recipes first) — this is why D-35 locks tags as fixed taxonomy

---

## Files with No Direct Analog

| File | Role | Data Flow | Reason | Mitigation |
|------|------|-----------|--------|-----------|
| `apps/patron/src/api/socket.ts` | service | event-driven | Socket.IO integration not yet in codebase | Use RESEARCH.md Pattern 1 and Pitfall 4 guidance; test Socket.IO+TanStack Query integration manually |
| `apps/patron/src/components/TagRail.tsx` | component | request-response | No icon-based filtering rail in Barback | Adapt picker patterns (CategoryPicker for selection logic) + Lucide Icons for rail icons per UI-SPEC.md |
| `apps/patron/src/components/TagSubmenu.tsx` | component | request-response | No expandable submenu in Barback | Simple conditional render of tag list; follow Patron's dark-neon Tailwind patterns |

---

## Metadata

**Pattern extraction date:** 2026-08-12
**Analog search scope:** `apps/barback`, `apps/server`, `packages/shared` (Phases 1-2.1)
**Files scanned:** 38 source files
**High-confidence analogs:** 12 (exact + role-match)
**Medium-confidence analogs:** 3 (partial, requires adaptation)
**No-analog files:** 3 (use RESEARCH.md patterns as guidance)

**Key assumptions verified:**
- ✅ Barback's TanStack Query hooks exist and follow consistent pattern
- ✅ Barback's API client (`apiFetch`) is reusable
- ✅ antd component library is Barback-only; Patron uses Tailwind
- ✅ Fastify route plugin pattern is consistent across routes
- ✅ Drizzle ORM table patterns established for new many-to-many relationships
- ⚠️ Socket.IO not yet implemented in server (assumption: standard Fastify integration applies)

---

*Phase: 3 — Patron Browse Experience*
*Pattern mapping completed: 2026-08-12*
