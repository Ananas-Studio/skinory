import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CameraOff,
  CircleAlert,
  Flashlight,
  FlashlightOff,
  Loader2,
  PackageSearch,
  RefreshCw,
  ScanBarcode,
  ShieldAlert,
  Zap,
} from '@skinory/ui/icons'
import { IconButton, PrimaryButton, SecondaryButton } from './shared'
import { useBarcodeScan } from '../hooks/useBarcodeScan'
import { resolveBarcode, evaluateProduct, ApiError, type LookupResult } from '../lib/scan-api'
import { useAuth } from '../contexts/auth-context'

const SCANNER_CONTAINER_ID = 'barcode-scanner'

type ScanPhase =
  | 'scanning'
  | 'detected'
  | 'resolving'
  | 'found'
  | 'not_found'
  | 'needs_ingredients'
  | 'usage_limit'
  | 'error'

function ScanScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const [phase, setPhase] = useState<ScanPhase>('scanning')
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const processingRef = useRef(false)

  const handleDetected = useCallback(
    async (result: { text: string; format: string }) => {
      if (processingRef.current) return
      processingRef.current = true

      setPhase('detected')

      // Brief flash before resolving
      await new Promise((r) => setTimeout(r, 400))
      setPhase('resolving')

      try {
        const lookup = await resolveBarcode(userId, result.text, result.format)
        setLookupResult(lookup)

        // Product truly not found — source is 'not_found'
        if (lookup.product.source === 'not_found') {
          setPhase('not_found')
          return
        }

        if (lookup.needsIngredients) {
          setPhase('needs_ingredients')
          return
        }

        setPhase('found')

        // Brief preview then navigate to evaluation
        await new Promise((r) => setTimeout(r, 800))

        try {
          const evaluation = await evaluateProduct(userId, lookup.product.id)
          navigate('/adviser/result', { state: { result: evaluation } })
        } catch {
          // Fallback: navigate with just productId for AdviserResultScreen to evaluate
          navigate('/adviser/result', { state: { productId: lookup.product.id } })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to look up barcode'
        setErrorMessage(msg)
        toast.error(msg)

        if (err instanceof ApiError && err.code === 'USAGE_LIMIT_EXCEEDED') {
          setPhase('usage_limit')
        } else {
          setPhase('error')
        }
      } finally {
        processingRef.current = false
      }
    },
    [navigate, userId],
  )

  const {
    scanning,
    error: scanError,
    permissionStatus,
    startScan,
  } = useBarcodeScan({
    containerId: SCANNER_CONTAINER_ID,
    autoStart: true,
    onDetected: handleDetected,
    stopOnDetected: true,
  })

  function handleRetry() {
    setPhase('scanning')
    setLookupResult(null)
    setErrorMessage('')
    processingRef.current = false
    startScan()
  }

  function handleNeedsIngredients() {
    if (lookupResult) {
      navigate('/scan/ingredients', { state: { productId: lookupResult.product.id, product: lookupResult.product } })
    }
  }

  // ── Permission denied state ──────────────────────────────────────────────
  if (permissionStatus === 'denied' || scanError?.type === 'permission_denied') {
    return (
      <main className="flex h-dvh flex-col bg-[#18181b] text-white [font-family:Geist,'Avenir_Next','Segoe_UI',sans-serif]">
        <div className="flex items-center gap-3 px-4 pt-4">
          <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-white/20 bg-black/30 text-white hover:bg-black/40">
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="text-[16px] font-semibold text-white">Scan Product</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
          <ShieldAlert size={48} className="text-white/70" />
          <p className="text-center text-[18px] font-medium text-white">Camera Access Required</p>
          <p className="text-center text-[14px] leading-[20px] text-white/60">
            Skinory needs camera access to scan barcodes. Please enable it in your browser or device settings.
          </p>
          <SecondaryButton onClick={() => navigate(-1)} className="mt-2">
            Go Back
          </SecondaryButton>
        </div>
      </main>
    )
  }

  // ── Camera not found state ───────────────────────────────────────────────
  if (scanError?.type === 'camera_not_found') {
    return (
      <main className="flex h-dvh flex-col bg-[#18181b] text-white [font-family:Geist,'Avenir_Next','Segoe_UI',sans-serif]">
        <div className="flex items-center gap-3 px-4 pt-4">
          <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-white/20 bg-black/30 text-white hover:bg-black/40">
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="text-[16px] font-semibold text-white">Scan Product</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
          <CameraOff size={48} className="text-white/70" />
          <p className="text-center text-[18px] font-medium text-white">No Camera Found</p>
          <p className="text-center text-[14px] leading-[20px] text-white/60">
            We couldn't find a camera on this device. Make sure your camera is connected and try again.
          </p>
          <PrimaryButton onClick={() => startScan()} className="mt-2">
            <RefreshCw size={16} />
            Try Again
          </PrimaryButton>
        </div>
      </main>
    )
  }

  // ── Initialization error state ───────────────────────────────────────────
  if (scanError && phase === 'scanning') {
    return (
      <main className="flex h-dvh flex-col bg-[#18181b] text-white [font-family:Geist,'Avenir_Next','Segoe_UI',sans-serif]">
        <div className="flex items-center gap-3 px-4 pt-4">
          <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-white/20 bg-black/30 text-white hover:bg-black/40">
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="text-[16px] font-semibold text-white">Scan Product</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
          <CircleAlert size={48} className="text-[#ee886e]" />
          <p className="text-center text-[18px] font-medium text-white">Scanner Error</p>
          <p className="text-center text-[14px] leading-[20px] text-white/60">{scanError.message}</p>
          <PrimaryButton onClick={handleRetry} className="mt-2">
            <RefreshCw size={16} />
            Try Again
          </PrimaryButton>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-black text-white [font-family:Geist,'Avenir_Next','Segoe_UI',sans-serif]">
      {/* Camera preview — html5-qrcode renders its video element here.
          Sizing is forced via #barcode-scanner rules in index.css because
          the library sets inline styles that override Tailwind classes. */}
      <div id={SCANNER_CONTAINER_ID} />

      {/* Scanning frame overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative h-[260px] w-[260px]">
          {/* Corner accents */}
          <div className="absolute -top-px -left-px h-8 w-8 rounded-tl-2xl border-t-[3px] border-l-[3px] border-white" />
          <div className="absolute -top-px -right-px h-8 w-8 rounded-tr-2xl border-t-[3px] border-r-[3px] border-white" />
          <div className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white" />
          <div className="absolute -bottom-px -right-px h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-white" />

          {/* Animated scan line */}
          {scanning && phase === 'scanning' && (
            <div className="animate-scan-line absolute inset-x-2 top-0 h-[2px] rounded-full bg-[#ee886e] shadow-[0_0_8px_rgba(238,136,110,0.6)]" />
          )}
        </div>
      </div>

      {/* Detection flash overlay */}
      {phase === 'detected' && (
        <div className="animate-flash pointer-events-none absolute inset-0 z-30 bg-white/30" />
      )}

      {/* Top bar */}
      <div className="relative z-20 flex items-center gap-3 px-4 pt-[max(1rem,var(--safe-top))]">
        <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-white/20 bg-black/30 text-white hover:bg-black/40">
          <ArrowLeft size={16} />
        </IconButton>
        <h1 className="text-[16px] font-semibold text-white">Scan Product</h1>
      </div>

      {/* Bottom overlay area */}
      <div className="relative z-20 mt-auto flex flex-col items-center gap-4 px-6 pb-[max(6rem,calc(4rem+var(--safe-bottom)))] pt-4">
        {/* Phase-specific UI */}
        {phase === 'scanning' && permissionStatus === 'checking' && (
          <StatusPill>
            <Loader2 size={16} className="animate-spin" />
            Requesting camera access…
          </StatusPill>
        )}

        {phase === 'scanning' && scanning && (
          <StatusPill>
            <ScanBarcode size={16} />
            Point at a barcode
          </StatusPill>
        )}

        {phase === 'detected' && (
          <StatusPill variant="success">
            <ScanBarcode size={16} />
            Barcode detected!
          </StatusPill>
        )}

        {phase === 'resolving' && (
          <StatusPill>
            <Loader2 size={16} className="animate-spin" />
            Looking up product…
          </StatusPill>
        )}

        {phase === 'found' && lookupResult && (
          <div className="flex w-full items-center gap-3 rounded-2xl bg-white/95 p-3 backdrop-blur-sm">
            {lookupResult.product.imageUrl ? (
              <img
                src={lookupResult.product.imageUrl}
                alt={lookupResult.product.name ?? 'Product'}
                className="size-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#f9ded7,#f4cbc0)]">
                <PackageSearch size={20} className="text-[#ee886e]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-[#18181b]">{lookupResult.product.name}</p>
              {lookupResult.product.brand && (
                <p className="truncate text-[12px] text-[#71717a]">{lookupResult.product.brand}</p>
              )}
            </div>
            <Loader2 size={18} className="animate-spin shrink-0 text-[#ee886e]" />
          </div>
        )}

        {phase === 'not_found' && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            <PackageSearch size={36} className="text-[#71717a]" />
            <p className="text-center text-[16px] font-medium text-[#18181b]">Product Not Found</p>
            <p className="text-center text-[13px] leading-[18px] text-[#71717a]">
              We couldn't find this product in our database.
            </p>
            <div className="mt-1 flex w-full gap-2">
              <SecondaryButton onClick={handleRetry} className="flex-1 min-h-10 text-[13px]">
                <RefreshCw size={14} />
                Try Again
              </SecondaryButton>
              <PrimaryButton onClick={() => navigate('/scan/ingredients')} className="flex-1 min-h-10 text-[13px]">
                Enter Manually
              </PrimaryButton>
            </div>
          </div>
        )}

        {phase === 'usage_limit' && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            <div className="grid size-12 place-items-center rounded-xl bg-[#fef4e1]">
              <Zap size={24} className="text-[#b16900]" />
            </div>
            <p className="text-center text-[16px] font-medium text-[#18181b]">Scan Limit Reached</p>
            <p className="text-center text-[13px] leading-[18px] text-[#71717a]">
              You've reached your monthly scan limit. Upgrade your plan for unlimited scans.
            </p>
            <SecondaryButton onClick={() => navigate(-1)} className="mt-1 w-full min-h-10 text-[13px]">
              <ArrowLeft size={14} />
              Go Back
            </SecondaryButton>
          </div>
        )}

        {phase === 'needs_ingredients' && lookupResult && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            <div className="grid size-12 place-items-center rounded-xl bg-[#fef4e1]">
              <CircleAlert size={24} className="text-[#b16900]" />
            </div>
            <p className="text-center text-[16px] font-medium text-[#18181b]">{lookupResult.product.name}</p>
            <p className="text-center text-[13px] leading-[18px] text-[#71717a]">
              We found this product but need its ingredients to evaluate it.
            </p>
            <div className="mt-1 flex w-full gap-2">
              <SecondaryButton onClick={handleRetry} className="flex-1 min-h-10 text-[13px]">
                Scan Again
              </SecondaryButton>
              <PrimaryButton onClick={handleNeedsIngredients} className="flex-1 min-h-10 text-[13px]">
                Add Ingredients
              </PrimaryButton>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            <CircleAlert size={36} className="text-[#d42b2b]" />
            <p className="text-center text-[16px] font-medium text-[#18181b]">Something Went Wrong</p>
            <p className="text-center text-[13px] leading-[18px] text-[#71717a]">{errorMessage}</p>
            <PrimaryButton onClick={handleRetry} className="mt-1 w-full min-h-10 text-[13px]">
              <RefreshCw size={14} />
              Try Again
            </PrimaryButton>
          </div>
        )}

        {/* Flashlight toggle */}
        {scanning && phase === 'scanning' && (
          <button
            type="button"
            onClick={() => setTorchOn((v) => !v)}
            className="mt-1 grid size-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
          >
            {torchOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
          </button>
        )}
      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success'
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium backdrop-blur-sm ${
        variant === 'success'
          ? 'bg-[#e1fee6]/90 text-[#009636]'
          : 'bg-white/90 text-[#3f3f46]'
      }`}
    >
      {children}
    </div>
  )
}

export default ScanScreen
