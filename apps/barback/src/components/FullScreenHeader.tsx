import type { CSSProperties } from 'react'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

export interface FullScreenHeaderProps {
  onBack: () => void
  title: string
  // Optional style override merged onto the title <h2> — RecipeDetailView
  // uses this to keep its UI-SPEC-documented Display-role (28px/600)
  // typography instead of the other 4 views' default Heading-role
  // (20px/600, from index.css's global h1,h2,h3 rule).
  titleStyle?: CSSProperties
}

// (260812-m0i) Shared full-screen header, replacing the identical inline
// header markup previously duplicated across AddEditIngredientView,
// AddEditRecipeView, RecipeDetailView, CategoryManager, and
// GlasswareManager. Fixes (1) the title not being truly centered — it
// previously just started wherever the Back button's rendered width
// happened to end — and (2) the plain-text "← Back" button being replaced
// with a circular accent icon-only button matching SearchFilterBar's
// square Add-button treatment (260812-jz9).
//
// Standard 3-column centering pattern: a fixed-width left cell (48px,
// matching the button's own 48x48 size) and a matching empty fixed-width
// right spacer cell let the title's flex: 1 + textAlign: center center it
// across the header's true remaining width, instead of merely starting
// after the button.
export function FullScreenHeader({ onBack, title, titleStyle }: FullScreenHeaderProps) {
  return (
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
      <h2 className="text-white" style={{ flex: 1, textAlign: 'center', ...titleStyle }}>
        {title}
      </h2>
      <div style={{ width: 48, flexShrink: 0 }} />
    </header>
  )
}
