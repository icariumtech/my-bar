import { Button, List } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { OrderStatus, Recipe, TriStateStatus } from '@my-bar/shared'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'
import { formatElapsed } from './OrdersTab.js'

interface RecipeOrOrderDetailProps {
  recipe: Recipe
  order?: { patronName: string | null; status: OrderStatus; elapsedSeconds: number }
  onBack: () => void
  onMarkDone?: () => void
}

function statusColor(status: TriStateStatus): string {
  if (status === 'green') return '#22c55e'
  if (status === 'yellow') return '#facc15'
  return '#ef4444'
}

// D-56: shared full detail view for both a plain recipe lookup (RecipesTab,
// no order prop — Task 1's call site) and an open order (OrdersTab, Plan
// 04-04's job to wire the entry point). Structure mirrors
// apps/barback/src/components/views/RecipeDetailView.tsx, with D-63's full
// tri-state badge (already true on Barback too — the Patron 2-state
// collapse is the outlier, not this component) plus the order-only
// elapsed-time caption and conditional Done button this plan adds.
// Bartender does not import from apps/barback, so the header below
// re-implements FullScreenHeader.tsx's shape inline rather than importing
// it.
export function RecipeOrOrderDetail({ recipe, order, onBack, onMarkDone }: RecipeOrOrderDetailProps) {
  const yellowLines = recipe.ingredients.filter((ing) => ing.status === 'yellow')
  // D-57: Done is only actionable while the order is still open — once
  // marked done, no caption/button renders here at all (OrdersTab's own
  // list is where a just-completed order's brief retention window lives,
  // D-60).
  const showOrderFooter = order !== undefined && order.status !== 'done'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ width: 48, flexShrink: 0 }}>
          <Button
            type="primary"
            shape="circle"
            icon={<ArrowLeftOutlined />}
            aria-label="Back"
            onClick={onBack}
            style={{ width: 48, height: 48, minWidth: 48, padding: 0 }}
          />
        </div>
        <h2 className="text-white" style={{ flex: 1, textAlign: 'center', fontSize: 28, fontWeight: 600 }}>
          {recipe.name}
        </h2>
        <div style={{ width: 48, flexShrink: 0 }} />
      </header>

      <main
        style={{
          flex: 1,
          padding: 16,
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

          {showOrderFooter && order && (
            <p className="text-zinc-400" style={{ margin: 0 }}>
              {`Ordered ${formatElapsed(order.elapsedSeconds)}${
                order.patronName ? ` for ${order.patronName}` : ''
              }`}
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
                    {/* BART-01: shows the specific ingredient name when this
                        line is locked to one (D-30's ingredientName), the
                        category name otherwise. */}
                    {`${ing.quantity} ${ing.unit} ${ing.ingredientName ?? ing.categoryName}`}
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
            <span className="text-white">{recipe.glasswareName ?? 'None specified'}</span>
          </div>

          {/* Garnish is decorative free text only — omitted entirely when
              null, never rendered with a "None specified" fallback (mirrors
              Barback's own glassware-vs-garnish asymmetry). */}
          {recipe.garnish && (
            <div>
              <h3 className="text-white" style={{ marginBottom: 8 }}>
                Garnish
              </h3>
              <span className="text-white">{recipe.garnish}</span>
            </div>
          )}

          {showOrderFooter && (
            <Button type="primary" block style={{ minHeight: 48 }} onClick={onMarkDone}>
              Done
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
