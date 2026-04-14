import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import {
  CLIMATE_TYPES,
  CLIMATE_LABELS,
  EXERCISE_FREQUENCIES,
  EXERCISE_LABELS,
  DIET_TYPES,
  DIET_LABELS,
  SMOKING_STATUSES,
  SMOKING_LABELS,
} from '@skinory/core'
import { useAuth } from '../../contexts/auth-context'
import { fetchProfile, updateSkinProfile, type ProfileData } from '../../lib/auth-api'
import { ScreenFrame } from '../shared'

const SCALE_LABELS: Record<string, string[]> = {
  sunExposure: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
  pollutionExposure: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
  stressLevel: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
  sleepQuality: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
  hydrationLevel: ['Very Low', 'Low', 'Moderate', 'Good', 'Excellent'],
  screenTime: ['< 2h', '2-4h', '4-6h', '6-8h', '8h+'],
}

function LifestyleEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [_profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [climateType, setClimateType] = useState<string | null>(null)
  const [exerciseFrequency, setExerciseFrequency] = useState<string | null>(null)
  const [dietType, setDietType] = useState<string | null>(null)
  const [smokingStatus, setSmokingStatus] = useState<string | null>(null)
  const [sunExposure, setSunExposure] = useState<number | null>(null)
  const [pollutionExposure, setPollutionExposure] = useState<number | null>(null)
  const [stressLevel, setStressLevel] = useState<number | null>(null)
  const [sleepQuality, setSleepQuality] = useState<number | null>(null)
  const [hydrationLevel, setHydrationLevel] = useState<number | null>(null)
  const [screenTime, setScreenTime] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProfile(userId)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        const sp = data.skinProfile
        setClimateType(sp?.climateType ?? null)
        setExerciseFrequency(sp?.exerciseFrequency ?? null)
        setDietType(sp?.dietType ?? null)
        setSmokingStatus(sp?.smokingStatus ?? null)
        setSunExposure(sp?.sunExposure ?? null)
        setPollutionExposure(sp?.pollutionExposure ?? null)
        setStressLevel(sp?.stressLevel ?? null)
        setSleepQuality(sp?.sleepQuality ?? null)
        setHydrationLevel(sp?.hydrationLevel ?? null)
        setScreenTime(sp?.screenTime ?? null)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await updateSkinProfile(userId, {
        climateType,
        exerciseFrequency,
        dietType,
        smokingStatus,
        sunExposure,
        pollutionExposure,
        stressLevel,
        sleepQuality,
        hydrationLevel,
        screenTime,
      })
      navigate(-1)
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }, [userId, climateType, exerciseFrequency, dietType, smokingStatus, sunExposure, pollutionExposure, stressLevel, sleepQuality, hydrationLevel, screenTime, navigate])

  if (loading) {
    return <ScreenFrame><div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[#EE886E]" /></div></ScreenFrame>
  }

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-dvh bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#09090b]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">Lifestyle & Environment</h1>
        <Button size="sm" className="bg-[#EE886E] hover:bg-[#d9775d] text-white" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
        </Button>
      </div>

      <div className="flex flex-col gap-5 p-4 pb-16">
        <Section title="Climate">
          <div className="flex flex-wrap gap-2">
            {CLIMATE_TYPES.map((t) => (
              <ChipButton key={t} label={CLIMATE_LABELS[t]} active={climateType === t} onClick={() => setClimateType(climateType === t ? null : t)} />
            ))}
          </div>
        </Section>

        <ScaleSection title="Sun Exposure" field="sunExposure" value={sunExposure} onChange={setSunExposure} />
        <ScaleSection title="Pollution Exposure" field="pollutionExposure" value={pollutionExposure} onChange={setPollutionExposure} />
        <ScaleSection title="Stress Level" field="stressLevel" value={stressLevel} onChange={setStressLevel} />
        <ScaleSection title="Sleep Quality" field="sleepQuality" value={sleepQuality} onChange={setSleepQuality} />
        <ScaleSection title="Hydration Level" field="hydrationLevel" value={hydrationLevel} onChange={setHydrationLevel} />
        <ScaleSection title="Screen Time" field="screenTime" value={screenTime} onChange={setScreenTime} />

        <Section title="Exercise Frequency">
          <div className="flex flex-wrap gap-2">
            {EXERCISE_FREQUENCIES.map((f) => (
              <ChipButton key={f} label={EXERCISE_LABELS[f]} active={exerciseFrequency === f} onClick={() => setExerciseFrequency(exerciseFrequency === f ? null : f)} />
            ))}
          </div>
        </Section>

        <Section title="Diet Type">
          <div className="flex flex-wrap gap-2">
            {DIET_TYPES.map((d) => (
              <ChipButton key={d} label={DIET_LABELS[d]} active={dietType === d} onClick={() => setDietType(dietType === d ? null : d)} />
            ))}
          </div>
        </Section>

        <Section title="Smoking Status">
          <div className="flex flex-wrap gap-2">
            {SMOKING_STATUSES.map((s) => (
              <ChipButton key={s} label={SMOKING_LABELS[s]} active={smokingStatus === s} onClick={() => setSmokingStatus(smokingStatus === s ? null : s)} />
            ))}
          </div>
        </Section>
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

function ScaleSection({ title, field, value, onChange }: { title: string; field: string; value: number | null; onChange: (v: number | null) => void }) {
  const labels = SCALE_LABELS[field] ?? ['1', '2', '3', '4', '5']
  return (
    <Section title={title}>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`flex-1 rounded-lg border py-2 text-center text-xs font-medium transition-colors ${
              value === n ? 'border-[#EE886E] bg-[#EE886E]/10 text-[#EE886E]' : 'border-[#e4e4e7] bg-white text-[#3f3f46] hover:bg-[#f4f4f5]'
            }`}
          >
            {labels[n - 1]}
          </button>
        ))}
      </div>
    </Section>
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

export default LifestyleEdit
