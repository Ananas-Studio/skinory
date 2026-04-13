import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  LinkIcon,
  Loader2,
  Sparkles,
  Globe,
  Database,
  ExternalLink,
  AlertCircle,
  Check,
  ClipboardPaste,
  Search,
} from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { Input } from '@skinory/ui/components/input'
import { useAuth } from '../contexts/auth-context'
import { IconButton } from './shared'
import {
  scrapeLink,
  detectProducts,
  enrichDetectedProducts,
  type ScrapeResult,
  type DetectedProduct,
  type EnrichedProduct,
} from '../lib/social-api'

// ─── Step status types ───────────────────────────────────────────────────────

type StepStatus = 'idle' | 'loading' | 'done' | 'error'

// ─── Platform badge ──────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white',
  tiktok: 'bg-black text-white',
  facebook: 'bg-[#1877F2] text-white',
  unknown: 'bg-gray-200 text-gray-700',
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.unknown}`}
    >
      {platform}
    </span>
  )
}

// ─── Confidence indicator ────────────────────────────────────────────────────

function ConfidenceLabel({ value }: { value: number }) {
  const { text, color } =
    value >= 0.8
      ? { text: 'High', color: 'text-green-600' }
      : value >= 0.5
        ? { text: 'Medium', color: 'text-yellow-600' }
        : { text: 'Low', color: 'text-red-500' }

  return <span className={`text-[10px] font-medium ${color}`}>{text} ({Math.round(value * 100)}%)</span>
}

// ─── Source badge ────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'internal' | 'obf' }) {
  if (source === 'internal') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
        <Database size={10} /> Skinory DB
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
      <Globe size={10} /> Open Beauty Facts
    </span>
  )
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({
  step,
  label,
  status,
}: {
  step: number
  label: string
  status: StepStatus
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          status === 'done'
            ? 'bg-green-100 text-green-700'
            : status === 'loading'
              ? 'bg-[#FEE7E1] text-[#EE886E]'
              : status === 'error'
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-400'
        }`}
      >
        {status === 'done' ? <Check size={12} /> : status === 'loading' ? <Loader2 size={12} className="animate-spin" /> : step}
      </div>
      <span
        className={`text-sm font-medium ${
          status === 'done' ? 'text-green-700' : status === 'loading' ? 'text-[#EE886E]' : status === 'error' ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

function SocialScannerScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  // URL input
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Step states
  const [scrapeStatus, setScrapeStatus] = useState<StepStatus>('idle')
  const [detectStatus, setDetectStatus] = useState<StepStatus>('idle')
  const [enrichStatus, setEnrichStatus] = useState<StepStatus>('idle')

  // Data
  const [scrapeData, setScrapeData] = useState<ScrapeResult | null>(null)
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([])
  const [enrichedProducts, setEnrichedProducts] = useState<EnrichedProduct[]>([])

  // Errors
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [enrichError, setEnrichError] = useState<string | null>(null)

  // ── Paste from clipboard ─────────────────────────────────────────────
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text)
    } catch {
      // Clipboard not available
    }
  }, [])

  // ── Reset all ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setUrl('')
    setScrapeStatus('idle')
    setDetectStatus('idle')
    setEnrichStatus('idle')
    setScrapeData(null)
    setDetectedProducts([])
    setEnrichedProducts([])
    setScrapeError(null)
    setDetectError(null)
    setEnrichError(null)
    inputRef.current?.focus()
  }, [])

  // ── Step 1: Scrape ───────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return

    setScrapeStatus('loading')
    setScrapeError(null)
    setScrapeData(null)
    setDetectStatus('idle')
    setEnrichStatus('idle')
    setDetectedProducts([])
    setEnrichedProducts([])

    try {
      const data = await scrapeLink(userId, url.trim())
      setScrapeData(data)
      setScrapeStatus('done')
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Failed to read the social post')
      setScrapeStatus('error')
    }
  }, [url, userId])

  // ── Step 2: Auto-detect when scrape succeeds ─────────────────────────
  useEffect(() => {
    if (scrapeStatus !== 'done' || !scrapeData?.preview.text) return

    let cancelled = false
    setDetectStatus('loading')
    setDetectError(null)

    detectProducts(userId, scrapeData.preview.text)
      .then((result) => {
        if (cancelled) return
        setDetectedProducts(result.detectedProducts)
        setDetectStatus('done')
      })
      .catch((err) => {
        if (cancelled) return
        setDetectError(err instanceof Error ? err.message : 'Failed to detect products')
        setDetectStatus('error')
      })

    return () => { cancelled = true }
  }, [scrapeStatus, scrapeData, userId])

  // ── Step 3: Auto-enrich when detect succeeds ─────────────────────────
  useEffect(() => {
    if (detectStatus !== 'done' || detectedProducts.length === 0) return

    let cancelled = false
    setEnrichStatus('loading')
    setEnrichError(null)

    enrichDetectedProducts(userId, detectedProducts)
      .then((result) => {
        if (cancelled) return
        setEnrichedProducts(result.products)
        setEnrichStatus('done')
      })
      .catch((err) => {
        if (cancelled) return
        setEnrichError(err instanceof Error ? err.message : 'Failed to enrich products')
        setEnrichStatus('error')
      })

    return () => { cancelled = true }
  }, [detectStatus, detectedProducts, userId])

  // ── Navigate to product evaluation ───────────────────────────────────
  const handleInspect = useCallback(
    (productId: string) => {
      navigate(`/products/${productId}`)
    },
    [navigate],
  )

  const isAnalyzing = scrapeStatus === 'loading' || detectStatus === 'loading' || enrichStatus === 'loading'

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <IconButton onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#EE886E]" />
          <h1 className="text-lg font-semibold">Social Scanner</h1>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* ── URL input ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Paste a link from Instagram, TikTok, or Facebook to detect skincare products.
          </p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="https://www.instagram.com/p/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
              className="flex-1"
              disabled={isAnalyzing}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePaste}
              disabled={isAnalyzing}
              className="shrink-0"
              title="Paste from clipboard"
            >
              <ClipboardPaste size={16} />
            </Button>
          </div>
          <Button
            type="button"
            className="bg-[#EE886E] hover:bg-[#d9775d] text-white"
            onClick={handleAnalyze}
            disabled={!url.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Search size={16} />
                Analyze Link
              </>
            )}
          </Button>
        </div>

        {/* ── Progress steps ──────────────────────────────────────── */}
        {scrapeStatus !== 'idle' && (
          <div className="flex flex-col gap-2 rounded-lg border bg-gray-50/50 p-3">
            <StepIndicator step={1} label="Reading post content" status={scrapeStatus} />
            <StepIndicator step={2} label="Detecting products (AI)" status={detectStatus} />
            <StepIndicator step={3} label="Enriching from databases" status={enrichStatus} />
          </div>
        )}

        {/* ── Errors ──────────────────────────────────────────────── */}
        {scrapeError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {scrapeError}
          </div>
        )}
        {detectError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {detectError}
          </div>
        )}
        {enrichError && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {enrichError}
          </div>
        )}

        {/* ── Preview ─────────────────────────────────────────────── */}
        {scrapeData && scrapeStatus === 'done' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={scrapeData.platform} />
              {scrapeData.preview.author && (
                <span className="text-xs text-muted-foreground">@{scrapeData.preview.author}</span>
              )}
            </div>
            {scrapeData.preview.thumbnail && (
              <img
                src={scrapeData.preview.thumbnail}
                alt="Post preview"
                className="h-32 w-full rounded-lg object-cover"
              />
            )}
            {scrapeData.preview.text && (
              <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-foreground line-clamp-4">
                {scrapeData.preview.text}
              </p>
            )}
          </div>
        )}

        {/* ── Detected products (raw LLM output) ─────────────────── */}
        {detectStatus === 'done' && detectedProducts.length > 0 && enrichStatus !== 'done' && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#EE886E]" />
              AI Detected {detectedProducts.length} product{detectedProducts.length > 1 ? 's' : ''}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {detectedProducts.map((dp, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800">
                  {[dp.brand, dp.name].filter(Boolean).join(' – ')}
                  {enrichStatus === 'loading' && <Loader2 size={10} className="animate-spin" />}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Enriched products (final results) ──────────────────── */}
        {enrichStatus === 'done' && (
          <div className="flex flex-col gap-3">
            {enrichedProducts.length > 0 ? (
              <>
                <h3 className="text-sm font-semibold">
                  Found {enrichedProducts.length} product{enrichedProducts.length > 1 ? 's' : ''}
                </h3>
                {enrichedProducts.map((product, i) => (
                  <div
                    key={`${product.source}-${product.productId ?? i}`}
                    className="flex items-center gap-3 rounded-xl border p-3"
                  >
                    <img
                      src={product.imageUrl ?? '/introduction-image.png'}
                      alt={product.name}
                      className="h-14 w-14 shrink-0 rounded-lg bg-muted object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <span className="text-sm font-medium leading-tight truncate">{product.name}</span>
                      {product.brand && (
                        <span className="text-xs text-muted-foreground truncate">{product.brand}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <SourceBadge source={product.source} />
                        <ConfidenceLabel value={product.confidence} />
                      </div>
                    </div>
                    {product.source === 'internal' && product.productId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1 text-xs"
                        onClick={() => handleInspect(product.productId!)}
                      >
                        <ExternalLink size={12} />
                        Analyze
                      </Button>
                    )}
                  </div>
                ))}
              </>
            ) : detectedProducts.length > 0 ? (
              <div className="flex flex-col gap-1.5 rounded-lg bg-yellow-50 p-3">
                <h3 className="text-sm font-semibold text-yellow-800">Products Mentioned</h3>
                <p className="text-xs text-yellow-700">
                  These products were detected but are not yet in our databases:
                </p>
                {detectedProducts.map((dp, i) => (
                  <span key={i} className="text-xs text-yellow-900">
                    • {[dp.brand, dp.name].filter(Boolean).join(' – ')}
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No skincare products detected in this post.
              </p>
            )}
          </div>
        )}

        {/* ── No text found after scrape ──────────────────────────── */}
        {scrapeStatus === 'done' && !scrapeData?.preview.text && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Could not read text from this post. Try a different link.
          </p>
        )}

        {/* ── Reset button ────────────────────────────────────────── */}
        {(scrapeStatus === 'done' || scrapeStatus === 'error') && !isAnalyzing && (
          <Button type="button" variant="outline" onClick={handleReset}>
            <LinkIcon size={14} />
            Analyze another link
          </Button>
        )}
      </div>
    </div>
  )
}

export default SocialScannerScreen
