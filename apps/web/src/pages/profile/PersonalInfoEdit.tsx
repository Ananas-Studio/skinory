import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { useAuth } from '../../contexts/auth-context'
import { fetchProfile, updateProfile, type ProfileData } from '../../lib/auth-api'
import { ScreenFrame } from '../shared'

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-Binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

function PersonalInfoEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProfile(userId)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setFullName(data.user.fullName ?? '')
        setPhone(data.user.phone ?? '')
        setBirthday(data.user.birthday ?? '')
        setGender(data.user.gender)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const hasChanges =
    fullName !== (profile?.user.fullName ?? '') ||
    phone !== (profile?.user.phone ?? '') ||
    birthday !== (profile?.user.birthday ?? '') ||
    gender !== (profile?.user.gender ?? null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateProfile(userId, {
        fullName: fullName || undefined,
        phone: phone || null,
        birthday: birthday || null,
        gender: gender || null,
      })
      navigate(-1)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }, [userId, fullName, phone, birthday, gender, navigate])

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
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#09090b]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">Personal Information</h1>
        {hasChanges && (
          <Button size="sm" className="bg-[#EE886E] hover:bg-[#d9775d] text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-4">
        <Field label="Full Name">
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="input-field" />
        </Field>

        <Field label="Email">
          <p className="text-sm text-[#71717a]">{profile?.user.email ?? 'No email'}</p>
        </Field>

        <Field label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="input-field" />
        </Field>

        <Field label="Birthday">
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="input-field" />
        </Field>

        <Field label="Gender">
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <ChipButton key={g.value} label={g.label} active={gender === g.value} onClick={() => setGender(gender === g.value ? null : g.value)} />
            ))}
          </div>
        </Field>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          font-size: 14px;
          color: #18181b;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #EE886E;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">{label}</label>
      {children}
    </div>
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

export default PersonalInfoEdit
