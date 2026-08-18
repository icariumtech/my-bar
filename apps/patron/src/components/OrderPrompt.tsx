import { useState } from 'react'

interface OrderPromptProps {
  onSubmit: (patronName: string | undefined) => void
  onCancel: () => void
  isSubmitting: boolean
}

// D-50: tapping Order opens this small "who's this for" prompt (optional
// free-text, blank allowed) before final submit. Uses Patron's existing
// neon token conventions — no Bartender/antd styling here (UI-SPEC Notes).
export function OrderPrompt({ onSubmit, onCancel, isSubmitting }: OrderPromptProps) {
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-patron-surface rounded-2xl glow-orange p-lg flex flex-col gap-md w-[min(90vw,360px)]">
        <h2 className="text-white">Who&apos;s this for?</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guest name (optional)"
          maxLength={100}
          className="rounded-lg bg-patron-bg text-white px-md py-sm border border-patron-accent/30 focus:outline-none focus:border-patron-accent"
        />
        <div className="flex gap-sm justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-md py-sm rounded-lg text-patron-text-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(name.trim() || undefined)}
            disabled={isSubmitting}
            className="px-md py-sm rounded-lg bg-patron-accent text-white glow-orange-subtle disabled:opacity-50"
          >
            Send Order
          </button>
        </div>
      </div>
    </div>
  )
}
