import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import {
  FITZPATRICK_TYPES,
  FITZPATRICK_INFO,
} from '@skinory/core'
import { useAuth } from '../../contexts/auth-context'
import {
  fetchProfile,
  fetchSkinConcerns,
  updateSkinProfile,
  updateSkinConcerns,
  type ProfileData,
  type SkinConcernOption,
} from '../../lib/auth-api'
import { ScreenFrame } from '../shared'

const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal', 'sensitive'] as const
const SENSITIVITY_LEVELS = ['low', 'medium', 'high'] as const

function SkinProfileEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [concernOptions, setConcernOptions] = useState<SkinConcernOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [skinType, setSkinType] = useState<string | null>(null)
  const [sensitivityLevel, setSensitivityLevel] = useState<string | null>(null)
  const [fitzpatrickType, setFitzpatrickType] = useState<string | null>(null)
  const [acneProne, setAcneProne] = useState<boolean | null>(null)
  const [selectedConcernIds, setSelectedConcernIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProfile(userId), fetchSkinConcerns()])
      .then(([data, concerns]) => {
        if (cancelled) return
        setProfile(data)
        setConcernOptions(concerns)
        setSkinType(data.skinProfile?.skinType ?? null)
        setSensitivityLevel(data.skinProfile?.sensitivityLevel ?? null)
        setFitzpatrickType(data.skinProfile?.fitzpatrickType ?? null)
        setAcneProne(data.skinProfile?.acneProne ?? null)
        setSelectedConcernIds(new Set(data.skinConcerns.map((c) => c.id)))
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const promises: Promise<unknown>[] = []

      const skinData: Record<string, unknown> = {}
      if (skinType !== (profile?.skinProfile?.skinType ?? null)) skinData.skinType = skinType
      if (sensitivityLevel !== (profile?.skinProfile?.sensitivityLevel ?? null)) skinData.sensitivityLevel = sensitivityLevel
      if (fitzpatrickType !== (profile?.skinProfile?.fitzpatrickType ?? null)) skinData.fitzpatrickType = fitzpatrickType
      if (acneProne !== (profile?.skinProfile?.acneProne ?? null)) skinData.acneProne = acneProne
      if (Object.keys(skinData).length > 0) promises.push(updateSkinProfile(userId, skinData))

      const prevIds = new Set(profile?.skinConcerns.map((c) => c.id) ?? [])
      const sameIds = selectedConcernIds.size === prevIds.size && [...selectedConcernIds].every((id) => prevIds.has(id))
      if (!sameIds) promises.push(updateSkinConcerns(userId, [...selectedConcernIds]))

      await Promise.all(promises)
      navigate(-1)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }, [userId, skinType, sensitivityLevel, fitzpatrickType, acneProne, selectedConcernIds, profile, navigate])

  const toggleConcern = useCallback((id: string) => {
    setSelectedConcernIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  if (loading) {
    return <ScreenFrame><div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[#EE886E]" /></div></ScreenFrame>
  }

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-dvh bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#09090b]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">Skin & Health Profile</h1>
        <Button size="sm" className="bg-[#EE886E] hover:bg-[#d9775d] text-white" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
        </Button>
      </div>

      <div className="flex flex-col gap-5 p-4 pb-16">
        <Section title="Skin Type">
          <div className="flex flex-wrap gap-2">
            {SKIN_TYPES.map((t) => (
              <ChipButton key={t} label={capitalize(t)} active={skinType === t} onClick={() => setSkinType(skinType === t ? null : t)} />
            ))}
          </div>
        </Section>

        <Section title="Sensitivity Level">
          <div className="flex flex-wrap gap-2">
            {SENSITIVITY_LEVELS.map((l) => (
              <ChipButton key={l} label={capitalize(l)} active={sensitivityLevel === l} onClick={() => setSensitivityLevel(sensitivityLevel === l ? null : l)} />
            ))}
          </div>
        </Section>

        <Section title="Fitzpatrick Skin Type">
          <div className="flex flex-wrap gap-2">
            {FITZPATRICK_TYPES.map((t) => (
              <ChipButton key={t} label={`${t} – ${FITZPATRICK_INFO[t].label}`} active={fitzpatrickType === t} onClick={() => setFitzpatrickType(fitzpatrickType === t ? null : t)} />
            ))}
          </div>
        </Section>

        <Section title="Acne Prone">
          <div className="flex gap-2">
            <ChipButton label="Yes" active={acneProne === true} onClick={() => setAcneProne(acneProne === true ? null : true)} />
            <ChipButton label="No" active={acneProne === false} onClick={() => setAcneProne(acneProne === false ? null : false)} />
          </div>
        </Section>

        {concernOptions.length > 0 && (
          <Section title="Skin Concerns">
            <div className="flex flex-wrap gap-2">
              {concernOptions.map((c) => (
                <ChipButton key={c.id} label={c.name} active={selectedConcernIds.has(c.id)} onClick={() => toggleConcern(c.id)} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  )
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default SkinProfileEdit
