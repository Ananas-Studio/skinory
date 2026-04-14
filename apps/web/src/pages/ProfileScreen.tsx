import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ChevronRight, Loader2, LogOut, User as UserIcon, Droplet, AlertTriangle, Heart, Leaf, Link2, Sparkles } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { USAGE_CATEGORY_LABELS, isAiCategory, type UsageCategory } from '@skinory/core'
import { useAuth } from '../contexts/auth-context'
import { fetchProfile, type ProfileData } from '../lib/auth-api'
import { fetchUsage, type UsageSummary } from '../lib/usage-api'
import { ScreenFrame } from './shared'

const SECTIONS = [
  {
    key: 'personal',
    label: 'Personal Information',
    icon: UserIcon,
    href: '/profile/personal',
    summary: (p: ProfileData | null) => {
      const parts: string[] = []
      if (p?.user.phone) parts.push(p.user.phone)
      if (p?.user.gender) parts.push(p.user.gender)
      return parts.join(' · ') || 'Name, email, phone, birthday'
    },
  },
  {
    key: 'skin',
    label: 'Skin & Health Profile',
    icon: Droplet,
    href: '/profile/skin',
    summary: (p: ProfileData | null) => {
      const parts: string[] = []
      if (p?.skinProfile?.skinType) parts.push(capitalize(p.skinProfile.skinType))
      if (p?.skinProfile?.sensitivityLevel) parts.push(`${capitalize(p.skinProfile.sensitivityLevel)} sensitivity`)
      if (p?.skinConcerns.length) parts.push(`${p.skinConcerns.length} concern${p.skinConcerns.length > 1 ? 's' : ''}`)
      return parts.join(' · ') || 'Skin type, sensitivity, concerns'
    },
  },
  {
    key: 'allergies',
    label: 'Allergies & Sensitivities',
    icon: AlertTriangle,
    href: '/profile/allergies',
    summary: (p: ProfileData | null) => {
      const count = p?.allergens.length ?? 0
      return count > 0 ? `${count} allergen${count > 1 ? 's' : ''} selected` : 'Manage ingredient sensitivities'
    },
  },
  {
    key: 'preferences',
    label: 'Product Preferences',
    icon: Heart,
    href: '/profile/preferences',
    summary: (p: ProfileData | null) => {
      const count = p?.productPreferences.length ?? 0
      return count > 0 ? `${count} preference${count > 1 ? 's' : ''} selected` : 'Vegan, cruelty-free, etc.'
    },
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle & Environment',
    icon: Leaf,
    href: '/profile/lifestyle',
    summary: (p: ProfileData | null) => {
      const parts: string[] = []
      if (p?.skinProfile?.climateType) parts.push(capitalize(p.skinProfile.climateType))
      if (p?.skinProfile?.exerciseFrequency) parts.push(capitalize(p.skinProfile.exerciseFrequency))
      return parts.join(' · ') || 'Climate, exercise, diet, sleep'
    },
  },
  {
    key: 'accounts',
    label: 'Connected Accounts',
    icon: Link2,
    href: '/profile/accounts',
    summary: (p: ProfileData | null) => {
      const count = p?.connections.length ?? 0
      return count > 0 ? `${count} account${count > 1 ? 's' : ''} connected` : 'Google, Apple'
    },
  },
] as const

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

function ProfileScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const userId = user!.id

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [signOutLoading, setSignOutLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchProfile(userId),
      fetchUsage(userId).catch(() => null),
    ])
      .then(([profileData, usageData]) => {
        if (!cancelled) {
          setProfile(profileData)
          setUsage(usageData)
        }
      })
      .catch((err) => { console.error(err); toast.error(err instanceof Error ? err.message : 'Failed to load profile') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const handleSignOut = useCallback(async () => {
    setSignOutLoading(true)
    try {
      await signOut()
      navigate('/signin', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to sign out')
      setSignOutLoading(false)
    }
  }, [signOut, navigate])

  if (loading) {
    return (
      <ScreenFrame>
        <div className="flex h-full items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#EE886E]" />
        </div>
      </ScreenFrame>
    )
  }

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-dvh bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#09090b]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">Profile</h1>
      </div>

      <div className="flex flex-col gap-6 p-4 pb-16">
        {/* Avatar & Info */}
        <section className="flex flex-col items-center gap-2 py-4">
          {profile?.user.avatarUrl ? (
            <img src={profile.user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-[#f4f4f5]" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FEE7E1] text-[#EE886E] text-2xl font-semibold">
              {(profile?.user.fullName ?? '?')[0].toUpperCase()}
            </div>
          )}
          <p className="text-lg font-semibold text-[#18181b]">{profile?.user.fullName ?? 'No name'}</p>
          <p className="text-sm text-[#71717a]">{profile?.user.email ?? 'No email'}</p>
        </section>

        {/* Section List */}
        <section className="flex flex-col gap-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => navigate(section.href)}
                className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-[#f4f4f5] active:bg-[#e4e4e7]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FEE7E1]">
                  <Icon size={18} className="text-[#EE886E]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#18181b]">{section.label}</p>
                  <p className="truncate text-xs text-[#71717a]">{section.summary(profile)}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#a1a1aa]" />
              </button>
            )
          })}
        </section>

        {/* Subscription & Usage */}
        {usage && (
          <section className="rounded-2xl border border-[#f4f4f5] bg-gradient-to-br from-[#FFF7F5] to-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#EE886E]">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#18181b]">Subscription</p>
              </div>
              <span className="rounded-full bg-[#EE886E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#EE886E]">
                {usage.tierName}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {(Object.entries(usage.limits) as [UsageCategory, typeof usage.limits[UsageCategory]][]).map(([cat, info]) => {
                const pct = info.limit > 0 ? Math.min(100, (info.used / info.limit) * 100) : 100
                const isAi = isAiCategory(cat)
                const isExhausted = info.remaining === 0
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#52525b]">
                        {isAi && '✨ '}{USAGE_CATEGORY_LABELS[cat]}
                      </span>
                      <span className={`text-xs font-medium ${isExhausted ? 'text-red-500' : 'text-[#71717a]'}`}>
                        {info.used}/{info.limit}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f4f4f5] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isExhausted ? 'bg-red-400' : isAi ? 'bg-[#EE886E]' : 'bg-[#a1a1aa]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[10px] text-[#a1a1aa] text-center">Resets monthly</p>
          </section>
        )}

        {/* Sign Out */}
        <section className="pt-2 border-t border-[#f4f4f5]">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleSignOut}
            disabled={signOutLoading}
          >
            {signOutLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            Sign Out
          </Button>
        </section>
      </div>
    </div>
  )
}

export default ProfileScreen
