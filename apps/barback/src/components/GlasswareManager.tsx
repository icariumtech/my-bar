import { useState } from 'react'
import { Alert, Button, Divider, Empty, Input, List, Modal } from 'antd'
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  DeleteGlasswareError,
  useCreateGlassware,
  useDeleteGlassware,
  useGlassware,
  useUpdateGlassware,
} from '../api/useGlassware.js'

interface GlasswareManagerProps {
  open: boolean
  onClose: () => void
}

// D-17/D-22: the owner's full glassware-list management surface — add,
// rename, and delete — reached from a secondary control in the App header
// (never the accent color, which is reserved for primary CTAs like "Add
// Recipe"/"Save Recipe" per 02-UI-SPEC.md's Color contract). Delete is
// refuse-only, mirroring CategoryManager.tsx's identical pattern.
export function GlasswareManager({ open, onClose }: GlasswareManagerProps) {
  const { data: glasswareList } = useGlassware()
  const createGlassware = useCreateGlassware()
  const updateGlassware = useUpdateGlassware()
  const deleteGlassware = useDeleteGlassware()

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteRefusal, setDeleteRefusal] = useState<string | null>(null)

  const glassware = glasswareList ?? []
  const trimmedNewName = newName.trim()

  async function handleCreate() {
    if (!trimmedNewName) return
    setCreateError(null)
    try {
      await createGlassware.mutateAsync({ name: trimmedNewName })
      setNewName('')
    } catch {
      setCreateError("Couldn't create glassware — check the name and try again.")
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
      await updateGlassware.mutateAsync({ id, input: { name: trimmed } })
      cancelEditing()
    } catch {
      setRenameError("Couldn't save — check your connection and try again.")
    }
  }

  async function handleDelete(id: string) {
    setDeleteRefusal(null)
    try {
      await deleteGlassware.mutateAsync(id)
    } catch (err) {
      // 02-UI-SPEC.md Copywriting Contract: the exact refusal copy, with
      // the real count substituted from the server's 409 body — surfaced
      // by useDeleteGlassware as DeleteGlasswareError.recipeCount rather
      // than a generic failure.
      if (err instanceof DeleteGlasswareError && err.recipeCount !== undefined) {
        setDeleteRefusal(
          `This glassware is used by ${err.recipeCount} recipe(s) — remove or reassign them first.`,
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
    onClose()
  }

  return (
    <Modal title="Manage Glassware" open={open} onCancel={handleClose} footer={null} destroyOnHidden>
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

      {glassware.length === 0 ? (
        <Empty description="No glassware types yet — add glassware options for your recipes." />
      ) : (
        <List
          dataSource={glassware}
          renderItem={(gw) => (
            <List.Item key={gw.id} style={{ minHeight: 48 }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {editingId === gw.id ? (
                  <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
                    <Input
                      value={editingName}
                      maxLength={60}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPressEnter={() => commitRename(gw.id)}
                      autoFocus
                    />
                    <Button
                      icon={<CheckOutlined />}
                      aria-label="Save"
                      loading={updateGlassware.isPending}
                      onClick={() => commitRename(gw.id)}
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
                    <span className="text-white">{gw.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        aria-label={`Rename ${gw.name}`}
                        onClick={() => startEditing(gw.id, gw.name)}
                        style={{ minHeight: 48, minWidth: 48 }}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Delete ${gw.name}`}
                        loading={deleteGlassware.isPending}
                        onClick={() => handleDelete(gw.id)}
                        style={{ minHeight: 48, minWidth: 48 }}
                      />
                    </div>
                  </div>
                )}
                {editingId === gw.id && renameError && (
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
          placeholder="New glassware name"
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
          loading={createGlassware.isPending}
          disabled={!trimmedNewName}
          onClick={handleCreate}
          style={{ minHeight: 48 }}
        >
          Add Glassware
        </Button>
      </div>
      {createError && <div style={{ color: '#ef4444', marginTop: 8 }}>{createError}</div>}
    </Modal>
  )
}
