import { useState } from 'react'
import { Button, ConfigProvider, Modal, theme } from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import type { Ingredient, Recipe } from '@my-bar/shared'
import { IngredientList } from './components/IngredientList.js'
import { AddEditIngredientForm } from './components/AddEditIngredientForm.js'
import { CategoryManager } from './components/CategoryManager.js'
import { GlasswareManager } from './components/GlasswareManager.js'
import { RecipeList } from './components/RecipeList.js'
import { RecipeForm } from './components/RecipeForm.js'
import { RecipeDetailView } from './components/RecipeDetailView.js'

// D-11/D-12: utilitarian dark identity, deliberately NOT the dark-neon
// Patron branding. Tokens match 01-UI-SPEC.md's Ant Design Theme
// Configuration exactly.
export default function App() {
  // One shared open/close state for AddEditIngredientForm serving both
  // flows (INV-02): `editingIngredient` undefined means Add mode,
  // populated means Edit mode against that row.
  const [formOpen, setFormOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [glasswareManagerOpen, setGlasswareManagerOpen] = useState(false)

  // D-14: the whole Recipes area (list + create/edit/view) lives in a
  // header-reached modal inside this existing Barback shell — no new
  // standalone app or route.
  const [recipesOpen, setRecipesOpen] = useState(false)
  const [recipeFormOpen, setRecipeFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined)
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | undefined>(undefined)

  function openAddForm() {
    setEditingIngredient(undefined)
    setFormOpen(true)
  }

  function openEditForm(ingredient: Ingredient) {
    setEditingIngredient(ingredient)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingIngredient(undefined)
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgLayout: '#18181b',
          colorBgContainer: '#27272a',
          colorPrimary: '#22c55e',
          colorError: '#ef4444',
        },
      }}
    >
      <div className="min-h-screen bg-bar-bg">
        <header className="p-md flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">My Bar — Barback</h1>
          <div className="flex items-center gap-sm">
            {/* Secondary control (default, not accent) — 01-UI-SPEC.md
                reserves the accent color for primary CTAs; "Add Ingredient"
                keeps that focal position. */}
            <Button
              icon={<SettingOutlined />}
              style={{ minHeight: 48 }}
              onClick={() => setCategoryManagerOpen(true)}
            >
              Categories
            </Button>
            {/* Secondary control (default, not accent) — 02-UI-SPEC.md
                reserves the accent color for primary CTAs (Add Recipe/Save
                Recipe/Add Step/Add Glassware-in-create-mode), not general
                navigation entry points like this header button. */}
            <Button
              icon={<SettingOutlined />}
              style={{ minHeight: 48 }}
              onClick={() => setGlasswareManagerOpen(true)}
            >
              Glassware
            </Button>
            {/* Secondary control (default, not accent) — same reasoning as
                the Categories/Glassware buttons above: accent stays
                reserved for primary CTAs, not this navigation entry
                point (D-14). */}
            <Button
              icon={<SettingOutlined />}
              style={{ minHeight: 48 }}
              onClick={() => setRecipesOpen(true)}
            >
              Recipes
            </Button>
            {/* D-13: 48px minimum tap target for one-handed thumb use. */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ minHeight: 48 }}
              onClick={openAddForm}
            >
              Add Ingredient
            </Button>
          </div>
        </header>
        <main className="px-md pb-3xl">
          <IngredientList onEdit={openEditForm} />
        </main>
        <AddEditIngredientForm ingredient={editingIngredient} open={formOpen} onClose={closeForm} />
        <CategoryManager
          open={categoryManagerOpen}
          onClose={() => setCategoryManagerOpen(false)}
        />
        <GlasswareManager
          open={glasswareManagerOpen}
          onClose={() => setGlasswareManagerOpen(false)}
        />
        <Modal
          title="Recipes"
          open={recipesOpen}
          onCancel={() => setRecipesOpen(false)}
          footer={null}
          width={720}
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ minHeight: 48 }}
              onClick={() => {
                setEditingRecipe(undefined)
                setRecipeFormOpen(true)
              }}
            >
              Add Recipe
            </Button>
          </div>
          <RecipeList
            onEdit={(r) => {
              setEditingRecipe(r)
              setRecipeFormOpen(true)
            }}
            onView={(r) => setViewingRecipe(r)}
          />
        </Modal>
        <RecipeForm
          recipe={editingRecipe}
          open={recipeFormOpen}
          onClose={() => {
            setRecipeFormOpen(false)
            setEditingRecipe(undefined)
          }}
        />
        {viewingRecipe && (
          <RecipeDetailView
            recipe={viewingRecipe}
            open
            onClose={() => setViewingRecipe(undefined)}
          />
        )}
      </div>
    </ConfigProvider>
  )
}
