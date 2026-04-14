import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card } from '@skinory/ui/components/card'
import { Badge } from '@skinory/ui/components/badge'
import { Button } from '@skinory/ui/components/button'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Heart,
  Loader2,
  Moon,
  RefreshCw,
  Sun,
  TriangleAlert,
} from '@skinory/ui/icons'
import { cn } from '@skinory/ui/lib/utils'
import {
  ROUTINE_STEP_LABELS,
  type RoutineTime,
} from '@skinory/core'
import { ScreenFrame } from './shared'
import {
  getRoutines,
  generateRoutine,
  type RoutineView,
  type RoutineStepView,
} from '../lib/routine-api'
import { useAuth } from '../contexts/auth-context'

// ─── Step Card ───────────────────────────────────────────────────────────────

function RoutineStepCard({
  step,
  index,
  onPress,
}: {
  step: RoutineStepView
  index: number
  onPress?: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-[#4CAF50]">{index + 1}</span>
        <span className="text-[15px] font-semibold text-[#18181b]">
          {ROUTINE_STEP_LABELS[step.category] ?? step.category}
        </span>
      </div>

      <Card
        className={cn(
          'flex flex-row items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-none',
          onPress && 'cursor-pointer',
        )}
        onClick={onPress}
      >
        <img
          src={step.imageUrl ?? '/introduction-image.png'}
          alt={step.productName}
          className="size-16 shrink-0 rounded-lg object-cover"
          loading="lazy"
        />

        <div className="min-w-0 flex-1">
          {step.brandName ? (
            <p className="truncate text-[11px] leading-4 text-[#71717a]">
              {step.brandName}
            </p>
          ) : null}
          <p className="text-[14px] leading-5 font-medium text-[#18181b]">
            {step.productName}
          </p>

          <div className="mt-1.5 flex items-center gap-2">
            {step.matchScore != null ? (
              <Badge className="rounded-md bg-[#e1fee6] px-2 py-0.5 text-[12px] font-semibold text-[#009636] hover:bg-[#e1fee6]">
                {step.matchScore}/100
              </Badge>
            ) : null}
            {step.matchScore != null && step.matchScore >= 70 ? (
              <span className="flex items-center gap-1 text-[12px] text-[#009636]">
                <Heart size={12} fill="#009636" className="text-[#009636]" />
                It&apos;s a match!
              </span>
            ) : null}
          </div>
        </div>

        <ChevronRight size={18} className="shrink-0 text-[#a1a1aa]" />
      </Card>
    </div>
  )
}

// ─── Conflict Banner ─────────────────────────────────────────────────────────

function ConflictBanner({
  conflicts,
}: {
  conflicts: { rule: { message: string; reasonCode: string }; productA: string; productB: string }[]
}) {
  if (!conflicts.length) return null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#f3d8ab] bg-[#fef4e1] p-3">
      <div className="flex items-center gap-2">
        <TriangleAlert size={16} className="shrink-0 text-[#b16900]" />
        <span className="text-[13px] font-semibold text-[#b16900]">
          ⚠️ CAUTION — Ingredient Conflicts
        </span>
      </div>
      {conflicts.map((c, i) => (
        <p key={i} className="text-[12px] leading-4 text-[#92610a]">
          {c.rule.message}
        </p>
      ))}
    </div>
  )
}

// ─── Evening Hero Banner ─────────────────────────────────────────────────────

function EveningHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#5B6AAF] to-[#3D4785] p-6">
      {/* Stars */}
      <div className="absolute inset-0">
        {[
          { top: '15%', left: '10%' },
          { top: '25%', right: '15%' },
          { top: '40%', left: '25%' },
          { top: '20%', right: '30%' },
          { top: '35%', left: '65%' },
          { top: '10%', left: '45%' },
          { top: '45%', right: '20%' },
        ].map((pos, i) => (
          <span
            key={i}
            className="absolute text-white/70"
            style={pos}
          >
            +
          </span>
        ))}
      </div>

      {/* Wave */}
      <div className="absolute right-0 bottom-0 left-0">
        <svg viewBox="0 0 400 60" className="w-full" preserveAspectRatio="none">
          <path
            d="M0,30 C100,50 200,10 300,30 C350,40 380,35 400,30 L400,60 L0,60 Z"
            fill="rgba(255,255,255,0.1)"
          />
        </svg>
      </div>

      <div className="relative flex flex-col items-center gap-2">
        <Moon size={32} className="text-[#F5E6A3]" />
        <h2 className="text-xl font-bold text-white">Evening</h2>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyRoutine({
  onGenerate,
  loading,
}: {
  onGenerate: () => void
  loading: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE7E1]">
        <Sun size={28} className="text-[#EE886E]" />
      </div>
      <h2 className="text-lg font-semibold text-[#18181b]">No routine yet</h2>
      <p className="text-sm text-[#71717a]">
        Generate a personalized skincare routine based on your inventory and skin profile.
      </p>
      <Button
        onClick={onGenerate}
        disabled={loading}
        className="mt-2 rounded-full bg-[#4CAF50] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#43A047]"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        Generate My Routine
      </Button>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

function RoutineScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [activeTime, setActiveTime] = useState<RoutineTime>('morning')
  const [routines, setRoutines] = useState<RoutineView[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const loadRoutines = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRoutines(userId)
      setRoutines(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load routines')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadRoutines()
  }, [loadRoutines])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      const result = await generateRoutine(userId)
      setRoutines([result.morning, result.evening])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate routine')
    } finally {
      setGenerating(false)
    }
  }, [userId])

  const activeRoutine = routines.find(
    (r) => r.timeOfDay === activeTime && r.isActive,
  )

  const hasRoutines = routines.some((r) => r.isActive)

  return (
    <ScreenFrame className="bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-9 w-9 place-items-center rounded-full"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-[#18181b]" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#18181b]">
          Your Skincare Routine
        </h1>
        <div className="w-9" />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#EE886E]" />
        </div>
      ) : !hasRoutines ? (
        <EmptyRoutine onGenerate={handleGenerate} loading={generating} />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-6">
          {/* Skin Profile Link */}
          <Card
            className="flex cursor-pointer flex-row items-center gap-3 rounded-xl border border-[#d4edda] bg-[#f0faf1] p-3 shadow-none"
            onClick={() => navigate('/profile/skin')}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#18181b]">
                Your Skin Profile
              </p>
              <p className="text-[12px] text-[#71717a]">
                The Skincare Routine is based on this info.
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-[#71717a]" />
          </Card>

          {/* Time of Day Toggle */}
          <div className="flex rounded-full bg-[#f4f4f5] p-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTime('morning')}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-[14px] font-medium',
                activeTime === 'morning'
                  ? 'bg-white text-[#18181b] shadow-sm'
                  : 'text-[#71717a] hover:bg-transparent',
              )}
            >
              <Sun size={14} className={activeTime === 'morning' ? 'text-[#f59e0b]' : 'text-[#a1a1aa]'} />
              Morning
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTime('evening')}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-[14px] font-medium',
                activeTime === 'evening'
                  ? 'bg-[#4CAF50] text-white shadow-sm hover:bg-[#43A047]'
                  : 'text-[#71717a] hover:bg-transparent',
              )}
            >
              <Moon size={14} className={activeTime === 'evening' ? 'text-white' : 'text-[#a1a1aa]'} />
              Evening
            </Button>
          </div>

          {/* Evening Hero */}
          {activeTime === 'evening' ? <EveningHero /> : null}

          {/* Section Title */}
          {activeTime === 'morning' ? (
            <h2 className="text-lg font-bold text-[#18181b]">Steps for Today</h2>
          ) : null}

          {/* Conflict Warnings */}
          {activeRoutine?.conflicts?.length ? (
            <ConflictBanner conflicts={activeRoutine.conflicts} />
          ) : null}

          {/* Steps List */}
          {activeRoutine?.steps?.length ? (
            <div className="flex flex-col gap-4">
              {activeRoutine.steps.map((step, idx) => (
                <RoutineStepCard
                  key={step.id}
                  step={step}
                  index={idx}
                  onPress={
                    step.productId
                      ? () => navigate(`/product/${step.productId}`)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-[#71717a]">
                No steps for {activeTime} routine yet.
              </p>
            </div>
          )}

          {/* Regenerate Button */}
          <div className="mt-2 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-full border-[#e4e4e7] px-5 py-2 text-[13px] font-medium text-[#71717a] shadow-none"
            >
              {generating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Regenerate Routine
            </Button>
          </div>
        </div>
      )}
    </ScreenFrame>
  )
}

export default RoutineScreen
