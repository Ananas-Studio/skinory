import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Loader2, LogOut } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { useAuth } from '../contexts/auth-context'
import {
  fetchProfile,
  fetchSkinConcerns,
  updateProfile,
  updateSkinProfile,
  updateSkinConcerns,
  type ProfileData,
  type SkinConcernOption,
} from '../lib/auth-api'
import { IconButton, ScreenFrame } from './shared'

// ─── Constants ──────────────────────────────────────────────────────────────

const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal', 'sensitive'] as const
const SENSITIVITY_LEVELS = ['low', 'medium', 'high'] as const

// ─── Section components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider">{children}</h2>
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-[#EE886E] bg-[#EE886E]/10 text-[#EE886E]'
          : 'border-[#e4e4e7] bg-white text-[#3f3f46] hover:bg-[#f4f4f5]'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Main screen ────────────────────────────────────────────────────────────

function ProfileScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const userId = user!.id

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [concernOptions, setConcernOptions] = useState<SkinConcernOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [skinType, setSkinType] = useState<string | null>(null)
  const [sensitivityLevel, setSensitivityLevel] = useState<string | null>(null)
  const [acneProne, setAcneProne] = useState<boolean | null>(null)
  const [selectedConcernIds, setSelectedConcernIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchProfile(userId), fetchSkinConcerns()])
      .then(([profileData, concerns]) => {
        if (cancelled) return
        setProfile(profileData)
        setConcernOptions(concerns)
        setFullName(profileData.user.fullName ?? '')
        setSkinType(profileData.skinProfile?.skinType ?? null)
        setSensitivityLevel(profileData.skinProfile?.sensitivityLevel ?? null)
        setAcneProne(profileData.skinProfile?.acneProne ?? null)
        setSelectedConcernIds(new Set(profileData.skinConcerns.map((c) => c.id)))
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const promises: Promise<unknown>[] = []

      if (fullName !== (profile?.user.fullName ?? '')) {
        promises.push(updateProfile(userId, { fullName }))
      }

      const skinChanged =
        skinType !== (profile?.skinProfile?.skinType ?? null) ||
        sensitivityLevel !== (profile?.skinProfile?.sensitivityLevel ?? null) ||
        acneProne !== (profile?.skinProfile?.acneProne ?? null)

      if (skinChanged) {
        const data: Record<string, unknown> = {}
        if (skinType) data.skinType = skinType
        if (sensitivityLevel) data.sensitivityLevel = sensitivityLevel
        if (acneProne !== null) data.acneProne = acneProne
        promises.push(updateSkinProfile(userId, data))
      }

      const prevIds = new Set(profile?.skinConcerns.map((c) => c.id) ?? [])
      const sameIds = selectedConcernIds.size === prevIds.size && [...selectedConcernIds].every((id) => prevIds.has(id))
      if (!sameIds) {
        promises.push(updateSkinConcerns(userId, [...selectedConcernIds]))
      }

      await Promise.all(promises)

      // Refresh profile
      const updated = await fetchProfile(userId)
      setProfile(updated)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }, [userId, fullName, skinType, sensitivityLevel, acneProne, selectedConcernIds, profile])

  const handleSignOut = useCallback(async () => {
    setSignOutLoading(true)
    try {
      await signOut()
      navigate('/signin', { replace: true })
    } catch {
      setSignOutLoading(false)
    }
  }, [signOut, navigate])

  const toggleConcern = useCallback((id: string) => {
    setSelectedConcernIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  if (loading) {
    return (
      <ScreenFrame>
        <div className="flex h-full items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#EE886E]" />
        </div>
      </ScreenFrame>
    )
  }

  const hasChanges =
    fullName !== (profile?.user.fullName ?? '') ||
    skinType !== (profile?.skinProfile?.skinType ?? null) ||
    sensitivityLevel !== (profile?.skinProfile?.sensitivityLevel ?? null) ||
    acneProne !== (profile?.skinProfile?.acneProne ?? null) ||
    (() => {
      const prevIds = new Set(profile?.skinConcerns.map((c) => c.id) ?? [])
      return selectedConcernIds.size !== prevIds.size || ![...selectedConcernIds].every((id) => prevIds.has(id))
    })()

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <IconButton onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </IconButton>
        <h1 className="text-lg font-semibold flex-1">Profile Settings</h1>
        {hasChanges && (
          <Button
            variant="default"
            size="sm"
            className="bg-[#EE886E] hover:bg-[#d9775d] text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 p-4 pb-16">
        {/* Avatar & Info */}
        <section className="flex items-center gap-4">
          {profile?.user.avatarUrl ? (
            <img
              src={profile.user.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover border-2 border-[#f4f4f5]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE7E1] text-[#EE886E] text-xl font-semibold">
              {(profile?.user.fullName ?? '?')[0].toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-b border-transparent focus:border-[#EE886E] outline-none transition-colors"
              placeholder="Your name"
            />
            <p className="text-sm text-[#71717a]">{profile?.user.email ?? 'No email'}</p>
          </div>
        </section>

        {/* Connected Accounts */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Connected Accounts</SectionTitle>
          <div className="flex flex-col gap-2">
            {profile?.connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between rounded-xl border border-[#e4e4e7] px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium capitalize">{conn.provider}</span>
                  <span className="text-xs text-[#71717a]">{conn.email ?? conn.providerUserId}</span>
                </div>
                <ChevronRight size={16} className="text-[#a1a1aa]" />
              </div>
            ))}
          </div>
        </section>

        {/* Skin Type */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Skin Type</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {SKIN_TYPES.map((t) => (
              <Chip
                key={t}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
                active={skinType === t}
                onClick={() => setSkinType(skinType === t ? null : t)}
              />
            ))}
          </div>
        </section>

        {/* Sensitivity Level */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Sensitivity Level</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {SENSITIVITY_LEVELS.map((l) => (
              <Chip
                key={l}
                label={l.charAt(0).toUpperCase() + l.slice(1)}
                active={sensitivityLevel === l}
                onClick={() => setSensitivityLevel(sensitivityLevel === l ? null : l)}
              />
            ))}
          </div>
        </section>

        {/* Acne Prone */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Acne Prone</SectionTitle>
          <div className="flex gap-2">
            <Chip label="Yes" active={acneProne === true} onClick={() => setAcneProne(acneProne === true ? null : true)} />
            <Chip label="No" active={acneProne === false} onClick={() => setAcneProne(acneProne === false ? null : false)} />
          </div>
        </section>

        {/* Skin Concerns */}
        {concernOptions.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>Skin Concerns</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {concernOptions.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  active={selectedConcernIds.has(c.id)}
                  onClick={() => toggleConcern(c.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Sign Out */}
        <section className="pt-4 border-t border-[#f4f4f5]">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleSignOut}
            disabled={signOutLoading}
          >
            {signOutLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            Sign Out
          </Button>
        </section>
      </div>
    </div>
  )
}

export default ProfileScreen
