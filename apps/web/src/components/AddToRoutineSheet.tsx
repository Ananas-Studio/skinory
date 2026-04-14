import { useCallback, useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@skinory/ui/components/sheet'
import { Button } from '@skinory/ui/components/button'
import { AlarmClock, Check, Loader2, Moon, Plus, Sun, TriangleAlert } from '@skinory/ui/icons'
import { cn } from '@skinory/ui/lib/utils'
import {
  ROUTINE_STEP_CATEGORIES,
  ROUTINE_STEP_LABELS,
  ROUTINE_STEP_ICONS,
  type RoutineStepCategory,
  type RoutineTime,
} from '@skinory/core'
import {
  getRoutines,
  generateRoutine,
  addStepToRoutine,
  type RoutineView,
} from '../lib/routine-api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AddToRoutineSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  productId: string
  productName: string
}

type FlowStep = 'pick-time' | 'pick-category' | 'success'

// ─── Component ───────────────────────────────────────────────────────────────

export default function AddToRoutineSheet({
  open,
  onOpenChange,
  userId,
  productId,
  productName,
}: AddToRoutineSheetProps) {
  const [routines, setRoutines] = useState<RoutineView[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [adding, setAdding] = useState(false)
  const [flowStep, setFlowStep] = useState<FlowStep>('pick-time')
  const [selectedTime, setSelectedTime] = useState<RoutineTime | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<RoutineStepCategory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<string | null>(null)

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setFlowStep('pick-time')
      setSelectedTime(null)
      setSelectedCategory(null)
      setError(null)
      setAddedTo(null)
      fetchRoutines()
    }
  }, [open])

  const fetchRoutines = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRoutines(userId)
      setRoutines(data)
    } catch {
      setRoutines([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      await generateRoutine(userId)
      await fetchRoutines()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate routine')
    } finally {
      setGenerating(false)
    }
  }, [userId, fetchRoutines])

  const handleSelectTime = useCallback((time: RoutineTime) => {
    setSelectedTime(time)
    setFlowStep('pick-category')
  }, [])

  const handleAddStep = useCallback(async (category: RoutineStepCategory) => {
    if (!selectedTime || adding) return
    setSelectedCategory(category)
    setAdding(true)
    setError(null)

    const routine = routines.find((r) => r.timeOfDay === selectedTime)
    if (!routine) {
      setError('No routine found for selected time')
      setAdding(false)
      return
    }

    try {
      await addStepToRoutine(userId, routine.id, productId, category)
      setAddedTo(selectedTime === 'morning' ? '☀️ Morning' : '🌙 Evening')
      setFlowStep('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add step')
    } finally {
      setAdding(false)
    }
  }, [selectedTime, routines, userId, productId, adding])

  const hasRoutines = routines.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t-0 bg-[#fdf8f6] px-5 pb-[env(safe-area-inset-bottom,16px)]"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-[18px] font-bold text-[#2d2320]">
            <AlarmClock className="h-5 w-5 text-[#ee886e]" />
            Add to Routine
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[#71717a]">
            Add <span className="font-semibold text-[#2d2320]">{productName}</span> to your skincare routine
          </SheetDescription>
        </SheetHeader>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#ee886e]" />
          </div>
        )}

        {/* No routines — offer to generate */}
        {!loading && !hasRoutines && flowStep === 'pick-time' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4e0da]">
              <AlarmClock className="h-7 w-7 text-[#ee886e]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#2d2320]">No routine yet</p>
              <p className="mt-1 text-[13px] text-[#71717a]">
                Generate a personalized routine from your inventory first
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-xl bg-gradient-to-r from-[#ee886e] to-[#e8725a] px-6 py-2.5 text-[14px] font-bold text-white shadow-md shadow-[#ee886e]/25"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
              ) : (
                'Generate My Routine'
              )}
            </Button>
            {error && (
              <p className="text-[12px] text-rose-500">{error}</p>
            )}
          </div>
        )}

        {/* Step 1: Pick Morning or Evening */}
        {!loading && hasRoutines && flowStep === 'pick-time' && (
          <div className="space-y-3 pb-2">
            <p className="text-[13px] font-medium text-[#71717a]">Which routine?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSelectTime('morning')}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 border-[#ede8e6] bg-white p-5 transition-all hover:border-[#ee886e]/40 hover:shadow-md active:scale-[0.97]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <Sun className="h-6 w-6 text-amber-500" />
                </div>
                <span className="text-[14px] font-semibold text-[#2d2320]">Morning</span>
                <span className="text-[11px] text-[#71717a]">
                  {routines.find((r) => r.timeOfDay === 'morning')?.steps.length ?? 0} steps
                </span>
              </button>
              <button
                onClick={() => handleSelectTime('evening')}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 border-[#ede8e6] bg-white p-5 transition-all hover:border-[#ee886e]/40 hover:shadow-md active:scale-[0.97]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <Moon className="h-6 w-6 text-indigo-400" />
                </div>
                <span className="text-[14px] font-semibold text-[#2d2320]">Evening</span>
                <span className="text-[11px] text-[#71717a]">
                  {routines.find((r) => r.timeOfDay === 'evening')?.steps.length ?? 0} steps
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pick Category */}
        {!loading && hasRoutines && flowStep === 'pick-category' && (
          <div className="space-y-3 pb-2">
            <button
              onClick={() => setFlowStep('pick-time')}
              className="flex items-center gap-1 text-[13px] font-medium text-[#ee886e]"
            >
              ← Back
            </button>
            <p className="text-[13px] font-medium text-[#71717a]">
              What step is this product for?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {ROUTINE_STEP_CATEGORIES.map((cat) => {
                const routine = routines.find((r) => r.timeOfDay === selectedTime)
                const alreadyHas = routine?.steps.some((s) => s.category === cat && s.productId === productId)
                return (
                  <button
                    key={cat}
                    onClick={() => handleAddStep(cat)}
                    disabled={adding || !!alreadyHas}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left transition-all active:scale-[0.97]',
                      alreadyHas
                        ? 'border-emerald-200 bg-emerald-50 opacity-60'
                        : adding && selectedCategory === cat
                          ? 'border-[#ee886e] bg-[#fef0ec]'
                          : 'border-[#ede8e6] bg-white hover:border-[#ee886e]/40 hover:shadow-sm',
                    )}
                  >
                    <span className="text-[18px]">{ROUTINE_STEP_ICONS[cat]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#2d2320]">
                        {ROUTINE_STEP_LABELS[cat]}
                      </p>
                      {alreadyHas && (
                        <p className="text-[10px] text-emerald-600">Already added</p>
                      )}
                    </div>
                    {adding && selectedCategory === cat && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#ee886e]" />
                    )}
                    {alreadyHas && (
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                  </button>
                )
              })}
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5">
                <TriangleAlert className="h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-[12px] text-rose-600">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Success */}
        {flowStep === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#2d2320]">Added to {addedTo} Routine!</p>
              <p className="mt-1 text-[13px] text-[#71717a]">
                {productName} is now in your {selectedCategory ? ROUTINE_STEP_LABELS[selectedCategory] : ''} step
              </p>
            </div>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-[#ede8e6] px-5 text-[13px]"
              >
                Done
              </Button>
              <Button
                onClick={() => {
                  setFlowStep('pick-time')
                  setSelectedTime(null)
                  setSelectedCategory(null)
                  setAddedTo(null)
                }}
                className="rounded-xl bg-gradient-to-r from-[#ee886e] to-[#e8725a] px-5 text-[13px] font-bold text-white"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Another
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
