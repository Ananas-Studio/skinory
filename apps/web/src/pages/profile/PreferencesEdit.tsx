import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import {
  PREFERENCE_CATEGORY_LABELS,
} from '@skinory/core'
import { useAuth } from '../../contexts/auth-context'
import {
  fetchProfile,
  fetchPreferenceOptions,
  updatePreferences,
  type PreferenceOption,
} from '../../lib/auth-api'
import { ScreenFrame } from '../shared'

function PreferencesEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [options, setOptions] = useState<PreferenceOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProfile(userId), fetchPreferenceOptions()])
      .then(([profile, opts]) => {
        if (cancelled) return
        setOptions(opts)
        const ids = new Set(profile.productPreferences.map((p) => p.id))
        setSelectedIds(ids)
        setInitialIds(ids)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const hasChanges = selectedIds.size !== initialIds.size || ![...selectedIds].every((id) => initialIds.has(id))

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updatePreferences(userId, [...selectedIds])
      navigate(-1)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }, [userId, selectedIds, navigate])

  if (loading) {
    return <ScreenFrame><div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[#EE886E]" /></div></ScreenFrame>
  }

  const grouped = groupByCategory(options)

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-screen bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#09090b]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">Product Preferences</h1>
        {hasChanges && (
          <Button size="sm" className="bg-[#EE886E] hover:bg-[#d9775d] text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4 pb-16">
        <p className="text-sm text-[#71717a]">Select your product preferences. These help us recommend products that match your values.</p>

        {grouped.map(([category, items]) => (
          <section key={category} className="flex flex-col gap-2.5">
            <h2 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">
              {(PREFERENCE_CATEGORY_LABELS as Record<string, string>)[category] ?? category}
            </h2>
            <div className="flex flex-wrap gap-2">
              {items.map((p) => (
                <ChipButton key={p.id} label={p.name} active={selectedIds.has(p.id)} onClick={() => toggle(p.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function groupByCategory(options: PreferenceOption[]): [string, PreferenceOption[]][] {
  const map = new Map<string, PreferenceOption[]>()
  for (const o of options) {
    const list = map.get(o.category) ?? []
    list.push(o)
    map.set(o.category, list)
  }
  return [...map.entries()]
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'border-[#EE886E] bg-[#EE886E]/10 text-[#EE886E]' : 'border-[#e4e4e7] bg-white text-[#3f3f46] hover:bg-[#f4f4f5]'
      }`}
    >
      {label}
    </button>
  )
}

export default PreferencesEdit
