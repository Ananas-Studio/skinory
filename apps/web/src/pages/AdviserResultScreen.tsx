import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Heart,
  Loader2,
  MessagesSquare,
  Moon,
  Sparkles,
  SunMedium,
  TriangleAlert,
} from '@skinory/ui/icons'
import { Badge } from '@skinory/ui/components/badge'
import { IconButton, PrimaryButton, ScreenFrame, SecondaryButton } from './shared'
import {
  evaluateProduct,
  type EvaluationResult,
  type EvaluationReason,
} from '../lib/scan-api'
import { addToInventory } from '../lib/inventory-api'
import { useAuth } from '../contexts/auth-context'
import { fetchUsage, type CategoryUsage } from '../lib/usage-api'

interface LocationState {
  productId?: string
  result?: EvaluationResult
}

// ─── Decision banner config ──────────────────────────────────────────────────

const DECISION_CONFIG = {
  BUY: {
    bg: 'bg-[#f1fbe9]',
    border: 'border-[#009437]',
    text: 'text-[#009636]',
    label: 'BUY',
    Icon: CircleAlert,
  },
  DONT_BUY: {
    bg: 'bg-[#fee1e1]',
    border: 'border-[#d42b2b]',
    text: 'text-[#d42b2b]',
    label: "DON'T BUY",
    Icon: CircleAlert,
  },
  CAUTION: {
    bg: 'bg-[#fef4e1]',
    border: 'border-[#b16900]',
    text: 'text-[#b16900]',
    label: 'CAUTION',
    Icon: TriangleAlert,
  },
} as const

// ─── Sub-components ──────────────────────────────────────────────────────────

function DecisionBanner({ decision, summary }: { decision: keyof typeof DECISION_CONFIG; summary: string }) {
  const cfg = DECISION_CONFIG[decision]
  const Icon = cfg.Icon

  return (
    <div className={`flex flex-col gap-1 overflow-hidden rounded-[16px] border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-center gap-1">
        <Icon size={16} className={cfg.text} />
        <span className={`text-[16px] leading-none font-medium ${cfg.text}`}>{cfg.label}</span>
      </div>
      <p className="text-[14px] leading-[20px] text-[#3f3f46]">{summary}</p>
    </div>
  )
}

function ReasonCard({ reason }: { reason: EvaluationReason }) {
  return (
    <div className="flex items-center gap-2 rounded-[8px] border border-[#e2e8f0] bg-white p-[10px]">
      {reason.positive ? (
        <Check size={16} className="shrink-0 text-[#009636]" />
      ) : (
        <TriangleAlert size={16} className="shrink-0 text-[#b16900]" />
      )}
      <p className="flex-1 text-[14px] leading-[20px] text-black">{reason.text}</p>
    </div>
  )
}

function RoutineImpactSection({
  timeOfDay,
  description,
}: {
  timeOfDay: 'morning' | 'evening' | 'both'
  description: string
}) {
  const [active, setActive] = useState<'morning' | 'evening'>(
    timeOfDay === 'morning' ? 'morning' : 'evening',
  )

  return (
    <section className="flex flex-col gap-3 px-4 pt-6">
      <h2 className="text-[16px] leading-none font-medium text-black">Routine Impact</h2>
      <div className="flex items-center gap-3">
        <div className="flex h-[36px] items-center overflow-hidden rounded-full bg-[#f4f4f5]">
          <button
            type="button"
            onClick={() => setActive('morning')}
            className={`flex h-[36px] min-w-[36px] items-center justify-center rounded-full px-2 ${
              active === 'morning' ? 'bg-[#ee886e] text-white' : 'text-[#71717a]'
            }`}
          >
            <SunMedium size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActive('evening')}
            className={`flex h-[36px] min-w-[36px] items-center justify-center rounded-full px-2 ${
              active === 'evening' ? 'bg-[#ee886e] text-white' : 'text-[#71717a]'
            }`}
          >
            <Moon size={16} />
          </button>
        </div>
        <p className="text-[14px] leading-[20px] text-[#334155]">{description}</p>
      </div>
    </section>
  )
}

function LoadingState() {
  return (
    <ScreenFrame>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="animate-spin text-[#ee886e]" />
        <p className="text-[16px] font-medium text-[#3f3f46]">Analyzing product…</p>
        <p className="text-[14px] text-[#71717a]">This may take a few seconds</p>
      </div>
    </ScreenFrame>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <ScreenFrame>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
        <CircleAlert size={40} className="text-[#d42b2b]" />
        <p className="text-center text-[16px] font-medium text-[#3f3f46]">Analysis Failed</p>
        <p className="text-center text-[14px] text-[#71717a]">{message}</p>
        <PrimaryButton onClick={onRetry}>Try Again</PrimaryButton>
      </div>
    </ScreenFrame>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

function AdviserResultScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const state = location.state as LocationState | null

  const [result, setResult] = useState<EvaluationResult | null>(state?.result ?? null)
  const [loading, setLoading] = useState(!state?.result)
  const [error, setError] = useState<string | null>(null)
  const [addingToInventory, setAddingToInventory] = useState(false)
  const [inventoryAdded, setInventoryAdded] = useState(false)
  const [aiUsage, setAiUsage] = useState<CategoryUsage | null>(null)

  const productId = state?.productId ?? result?.productId

  async function runEvaluation() {
    if (!productId) {
      setError('No product selected')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await evaluateProduct(userId, productId)
      setResult(data)
    } catch (err: any) {
      setError(err.message ?? 'Evaluation failed')
      toast.error(err.message ?? 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!result && productId) {
      runEvaluation()
    } else if (!productId) {
      setLoading(false)
      setError('No product selected for evaluation')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch remaining AI evaluation usage
  useEffect(() => {
    fetchUsage(userId)
      .then((data) => setAiUsage(data.limits.ai_evaluation))
      .catch(() => {})
  }, [userId, result])

  async function handleAddToInventory() {
    if (!productId || addingToInventory || inventoryAdded) return
    setAddingToInventory(true)
    try {
      await addToInventory(userId, productId, 'scan')
      setInventoryAdded(true)
    } catch (err: any) {
      console.error('Failed to add to inventory:', err)
      toast.error(err.message ?? 'Failed to add to inventory')
    } finally {
      setAddingToInventory(false)
    }
  }

  function handleAskAdviser() {
    navigate('/adviser/chat', {
      state: {
        productId: productId,
        productInfo: result?.product ?? null,
      },
    })
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={runEvaluation} />
  if (!result) return <ErrorState message="No evaluation data" onRetry={() => navigate('/scan')} />

  const { product, decision, summary, reasons, routineImpact } = result

  return (
    <ScreenFrame>
      {/* Scrollable content */}
      <div className="flex flex-1 flex-col overflow-y-auto pb-[200px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Header */}
        <section className="flex flex-col gap-5 px-4 pt-4">
          {/* Nav row */}
          <div className="flex h-[32px] items-center justify-between">
            <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-[#e4e4e7] bg-white">
              <ArrowLeft size={16} />
            </IconButton>
            <IconButton className="size-[32px] rounded-[6px] bg-[#f4f4f5]">
              <Heart size={16} />
            </IconButton>
          </div>

          {/* AI evaluation usage badge */}
          {aiUsage && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[#FFF7F5] px-2.5 py-1.5 self-start">
              <Sparkles size={12} className={aiUsage.remaining === 0 ? 'text-red-400' : 'text-[#EE886E]'} />
              <span className={`text-xs font-medium ${aiUsage.remaining === 0 ? 'text-red-500' : 'text-[#71717a]'}`}>
                {aiUsage.remaining > 0
                  ? `${aiUsage.remaining} evaluation${aiUsage.remaining > 1 ? 's' : ''} remaining`
                  : 'No evaluation credits left'}
              </span>
            </div>
          )}

          {/* Product card */}
          <div className="flex items-start overflow-hidden">
            <div className="size-[86px] shrink-0 overflow-hidden rounded-[16px] bg-[linear-gradient(145deg,#f9ded7,#f4cbc0)]">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3 pl-3">
              <div className="flex flex-col gap-2 leading-none">
                <p className="text-[16px] text-[#71717a]">{product.brandName ?? ''}</p>
                <p className="text-[20px] font-medium tracking-[-0.6px] text-[#18181b]">
                  {product.name}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="rounded-[6px] bg-[#f4f4f5] px-2 py-1 text-[14px] leading-[1] font-normal text-[#09090b]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Decision banner */}
          <DecisionBanner decision={decision} summary={summary} />
        </section>

        {/* Reasons section */}
        <section className="flex flex-col gap-3 px-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] leading-none font-medium text-black">Reasons</h2>
            <button type="button" className="text-[12px] leading-[16px] text-[#64748b] underline">
              See All
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {reasons.map((reason, i) => (
              <ReasonCard key={i} reason={reason} />
            ))}
          </div>
        </section>

        {/* Routine Impact */}
        <RoutineImpactSection
          timeOfDay={routineImpact.timeOfDay}
          description={routineImpact.description}
        />
      </div>

      {/* Fixed bottom action bar */}
      <section className="absolute right-0 bottom-0 left-0 flex flex-col gap-2.5 border-t border-[#e4e4e7] bg-white px-4 pt-3 pb-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <PrimaryButton
          onClick={handleAddToInventory}
          disabled={addingToInventory || inventoryAdded}
        >
          {addingToInventory ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Adding…
            </>
          ) : inventoryAdded ? (
            <>
              <Check size={16} />
              Added to Inventory
            </>
          ) : (
            'Add to Inventory'
          )}
        </PrimaryButton>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton onClick={() => navigate('/scan')}>
            Scan Again
          </SecondaryButton>
          <SecondaryButton onClick={handleAskAdviser}>
            <MessagesSquare size={16} />
            Ask Adviser
          </SecondaryButton>
        </div>
      </section>
    </ScreenFrame>
  )
}

export default AdviserResultScreen
