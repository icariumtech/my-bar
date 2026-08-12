import { Button, List } from 'antd'
import type { Recipe, TriStateStatus } from '@my-bar/shared'
import { MakeableStatusBadge } from '../MakeableStatusBadge.js'

interface RecipeDetailViewProps {
  recipe: Recipe
  onBack: () => void
}

function statusColor(status: TriStateStatus): string {
  if (status === 'green') return '#22c55e'
  if (status === 'yellow') return '#facc15'
  return '#ef4444'
}

// D-26/BARBACK-02: full-screen replacement for the old Modal-wrapped
// RecipeDetailView — same header + back-button shell established by
// AddEditIngredientView/AddEditRecipeView. D-31/MATCH-05: adds per-line
// tri-state dots (not just the recipe-level rollup badge) and the yellow
// hint sentence plan 02.1-01 deliberately deferred; the red missing-
// categories sentence and the top badge are carried over unchanged from
// 02.1-01's minimal boolean-to-enum fix.
export function RecipeDetailView({ recipe, onBack }: RecipeDetailViewProps) {
  const yellowLines = recipe.ingredients.filter((ing) => ing.status === 'yellow')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Button type="text" onClick={onBack}>
          ← Back
        </Button>
        <h2 className="text-white" style={{ fontSize: 28, fontWeight: 600 }}>
          {recipe.name}
        </h2>
      </div>
      <main
        style={{
          flex: 1,
          padding: 16,
          // 260812-drh: reserve clearance for the fixed BottomTabBar
          // (48px min-height + safe-area inset) so content isn't hidden
          // behind it.
          paddingBottom: 'calc(16px + 48px + env(safe-area-inset-bottom))',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MakeableStatusBadge status={recipe.overallStatus} />

          {recipe.overallStatus === 'red' && (
            <p style={{ color: '#ef4444', margin: 0 }}>
              {`Can't make this right now. Missing: ${recipe.missingCategoryNames.join(', ')}.`}
            </p>
          )}

          {yellowLines.map((ing) => (
            <p key={ing.id} style={{ color: '#facc15', margin: 0 }}>
              {`The ${ing.ingredientName} you selected is out of stock, but ${ing.alternativeIngredientName} is available.`}
            </p>
          ))}

          <div>
            <h3 className="text-white" style={{ marginBottom: 8 }}>
              Ingredients
            </h3>
            <List
              size="small"
              dataSource={recipe.ingredients}
              renderItem={(ing) => (
                <List.Item key={ing.id}>
                  <span className="text-white">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: statusColor(ing.status),
                        marginRight: 8,
                      }}
                      aria-label={`${ing.status} status`}
                    />
                    {`${ing.quantity} ${ing.unit} ${ing.categoryName}`}
                  </span>
                </List.Item>
              )}
            />
          </div>

          <div>
            <h3 className="text-white" style={{ marginBottom: 8 }}>
              Method
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20, color: 'white' }}>
              {recipe.method.map((step, index) => (
                // Method steps have no stable id of their own (D-16: a flat
                // ordered string array) — index is the correct key since the
                // list only re-renders on recipe change, never local reorder.
                <li key={index} style={{ marginBottom: 4 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="text-white" style={{ marginBottom: 8 }}>
              Glassware
            </h3>
            {/* D-17: "None specified" fallback only for glassware — garnish
                (below) has no such fallback per D-18/02-UI-SPEC.md. */}
            <span className="text-white">{recipe.glasswareName ?? 'None specified'}</span>
          </div>

          {/* Garnish is decorative free text only (D-18) — omitted entirely
              when null, never rendered with "None specified" or any
              category/ingredient cross-reference. */}
          {recipe.garnish && (
            <div>
              <h3 className="text-white" style={{ marginBottom: 8 }}>
                Garnish
              </h3>
              <span className="text-white">{recipe.garnish}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
