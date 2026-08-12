import { useState } from 'react'
import { Alert, Button, Divider, Empty, Input, List } from 'antd'
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  DeleteCategoryError,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
} from '../api/useCategories.js'

interface CategoryManagerProps {
  onBack: () => void
}

// D-03: the owner's full category-taxonomy management surface — add,
// rename, and delete — reached from Settings tab's "Categories" menu item
// (never the accent color, which is reserved for the "Add Ingredient"
// primary CTA per 01-UI-SPEC.md's Color contract). Delete is refuse-only:
// no guided reassignment flow is built here (01-RESEARCH.md Open Question
// 2, this plan's Planner Assumptions).
// D-24/D-26: full-screen view (not Modal) with a back button, reached from
// SettingsTab's menu — internal add/rename/delete UX is unchanged from
// Phase 1, only the shell moved from Modal to full-screen.
export function CategoryManager({ onBack }: CategoryManagerProps) {
  const { data: categoryList } = useCategories()
  const createCategory = useCreateCategory()
  const renameCategory = useRenameCategory()
  const deleteCategory = useDeleteCategory()

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteRefusal, setDeleteRefusal] = useState<string | null>(null)

  const categories = categoryList ?? []
  const trimmedNewName = newName.trim()

  async function handleCreate() {
    if (!trimmedNewName) return
    setCreateError(null)
    try {
      await createCategory.mutateAsync({ name: trimmedNewName })
      setNewName('')
    } catch {
      setCreateError("Couldn't create category — check the name and try again.")
    }
  }

  function startEditing(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
    setRenameError(null)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingName('')
    setRenameError(null)
  }

  async function commitRename(id: string) {
    const trimmed = editingName.trim()
    if (!trimmed) return
    setRenameError(null)
    try {
      await renameCategory.mutateAsync({ id, input: { name: trimmed } })
      cancelEditing()
    } catch {
      setRenameError("Couldn't save — check your connection and try again.")
    }
  }

  async function handleDelete(id: string) {
    setDeleteRefusal(null)
    try {
      await deleteCategory.mutateAsync(id)
    } catch (err) {
      // D-03 Copywriting Contract: the exact refusal copy, with the real
      // count substituted from the server's 409 body — surfaced by
      // useDeleteCategory as DeleteCategoryError.ingredientCount rather
      // than a generic failure.
      if (err instanceof DeleteCategoryError && err.ingredientCount !== undefined) {
        setDeleteRefusal(
          `This category is used by ${err.ingredientCount} ingredient(s) — reassign or remove them first.`,
        )
      } else {
        setDeleteRefusal("Couldn't save — check your connection and try again.")
      }
    }
  }

  function handleClose() {
    cancelEditing()
    setNewName('')
    setCreateError(null)
    setDeleteRefusal(null)
    onBack()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button type="text" onClick={handleClose}>
          ← Back
        </Button>
        <h2 className="text-white">Manage Categories</h2>
      </header>
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
      {deleteRefusal && (
        <Alert
          type="error"
          title={deleteRefusal}
          showIcon
          closable
          onClose={() => setDeleteRefusal(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {categories.length === 0 ? (
        <Empty description="No categories yet — add your first one below." />
      ) : (
        <List
          dataSource={categories}
          renderItem={(cat) => (
            <List.Item key={cat.id} style={{ minHeight: 48 }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {editingId === cat.id ? (
                  <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
                    <Input
                      value={editingName}
                      maxLength={60}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPressEnter={() => commitRename(cat.id)}
                      autoFocus
                    />
                    <Button
                      icon={<CheckOutlined />}
                      aria-label="Save"
                      loading={renameCategory.isPending}
                      onClick={() => commitRename(cat.id)}
                      style={{ minHeight: 48, minWidth: 48 }}
                    />
                    <Button
                      icon={<CloseOutlined />}
                      aria-label="Cancel"
                      onClick={cancelEditing}
                      style={{ minHeight: 48, minWidth: 48 }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span className="text-white">{cat.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        aria-label={`Rename ${cat.name}`}
                        onClick={() => startEditing(cat.id, cat.name)}
                        style={{ minHeight: 48, minWidth: 48 }}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Delete ${cat.name}`}
                        loading={deleteCategory.isPending}
                        onClick={() => handleDelete(cat.id)}
                        style={{ minHeight: 48, minWidth: 48 }}
                      />
                    </div>
                  </div>
                )}
                {editingId === cat.id && renameError && (
                  <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{renameError}</span>
                )}
              </div>
            </List.Item>
          )}
        />
      )}

      <Divider />

      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          placeholder="New category name"
          value={newName}
          maxLength={60}
          onChange={(e) => {
            setNewName(e.target.value)
            setCreateError(null)
          }}
          onPressEnter={handleCreate}
        />
        {/* D-13: 48px minimum tap target. Accent color, since this is the
            manager's own primary CTA. */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={createCategory.isPending}
          disabled={!trimmedNewName}
          onClick={handleCreate}
          style={{ minHeight: 48 }}
        >
          Add Category
        </Button>
      </div>
      {createError && <div style={{ color: '#ef4444', marginTop: 8 }}>{createError}</div>}
      </main>
    </div>
  )
}
