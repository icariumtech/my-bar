import { List, Modal } from 'antd'
import type { Recipe } from '@my-bar/shared'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'

interface RecipeDetailViewProps {
  recipe: Recipe
  open: boolean
  onClose: () => void
}

// T-02-16: renders ONLY what the server already computed on `recipe` —
// makeable, missingCategoryNames — never recomputes or estimates makeable
// status client-side. The full "Can't make this right now. Missing:
// [...]." sentence lives here (not on MakeableStatusBadge, which only ever
// shows the two short strings).
export function RecipeDetailView({ recipe, open, onClose }: RecipeDetailViewProps) {
  return (
    <Modal title={recipe.name} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MakeableStatusBadge makeable={recipe.makeable} />

        {!recipe.makeable && (
          <p style={{ color: '#ef4444', margin: 0 }}>
            {`Can't make this right now. Missing: ${recipe.missingCategoryNames.join(', ')}.`}
          </p>
        )}

        <div>
          <h3 className="text-white" style={{ marginBottom: 8 }}>
            Ingredients
          </h3>
          <List
            size="small"
            dataSource={recipe.ingredients}
            renderItem={(ing) => (
              <List.Item key={ing.id}>
                <span className="text-white">{`${ing.quantity} ${ing.unit} ${ing.categoryName}`}</span>
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
    </Modal>
  )
}
