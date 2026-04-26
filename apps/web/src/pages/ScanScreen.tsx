import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CircleAlert,
  Flashlight,
  FlashlightOff,
  Loader2,
  PackageSearch,
  PlusCircle,
  RefreshCw,
  ScanBarcode,
  ShieldAlert,
  Sparkles,
  Tag,
  Zap,
} from '@skinory/ui/icons'
import { IconButton, PrimaryButton, SecondaryButton } from './shared'
import { useBarcodeScan } from '../hooks/useBarcodeScan'
import { resolveBarcode, evaluateProduct, recognizeImage, ApiError, type LookupResult, type ImageRecognitionResult, type ImageRecognitionCandidate } from '../lib/scan-api'
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
  | 'photo_processing'
  | 'photo_exact'
  | 'photo_candidates'
  | 'photo_none'

function ScanScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const [phase, setPhase] = useState<ScanPhase>('scanning')
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const processingRef = useRef(false)
  const [photoResult, setPhotoResult] = useState<ImageRecognitionResult | null>(null)

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

  async function handlePhotoCapture() {
    // Grab the live video element inside the scanner container
    const container = document.getElementById(SCANNER_CONTAINER_ID)
    const video = container?.querySelector('video')
    if (!video || video.readyState < 2) {
      toast.error('Camera is not ready yet')
      return
    }

    // Draw current frame onto a temporary canvas
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    // Convert to blob → File
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    )
    if (!blob) return

    const file = new File([blob], 'photo-scan.jpg', { type: 'image/jpeg' })

    setPhase('photo_processing')
    setErrorMessage('')
    setPhotoResult(null)

    try {
      const result = await recognizeImage(userId, file)
      setPhotoResult(result)

      if (result.matchType === 'exact' && result.matchedProduct) {
        setPhase('photo_exact')
        setTimeout(async () => {
          try {
            const evalResult = await evaluateProduct(userId, result.matchedProduct!.id)
            navigate('/adviser/result', { state: { result: evalResult } })
          } catch {
            navigate('/adviser/result', { state: { productId: result.matchedProduct!.id } })
          }
        }, 1200)
      } else if (result.matchType === 'candidates') {
        setPhase('photo_candidates')
      } else {
        setPhase('photo_none')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recognition failed'
      setErrorMessage(msg)
      toast.error(msg)
      setPhase('error')
    }
  }

  async function handleSelectCandidate(candidate: ImageRecognitionCandidate) {
    try {
      const evalResult = await evaluateProduct(userId, candidate.id)
      navigate('/adviser/result', { state: { result: evalResult } })
    } catch {
      navigate('/adviser/result', { state: { productId: candidate.id } })
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
      {/* Camera preview — BarcodeDetector provider renders a <video> here. */}
      <div id={SCANNER_CONTAINER_ID} />

      {/* Scanning frame overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative h-[180px] w-[300px]">
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
            <img
              src={lookupResult.product.imageUrl ?? '/no-product.svg'}
              alt={lookupResult.product.name ?? 'Product'}
              className="size-12 shrink-0 rounded-xl object-cover"
            />
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

        {/* ── Photo recognition phases ── */}

        {phase === 'photo_processing' && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            <Loader2 size={32} className="animate-spin text-[#ee886e]" />
            <p className="text-center text-[15px] font-medium text-[#18181b]">Recognizing product…</p>
            <p className="text-center text-[13px] text-[#71717a]">Scanning for barcodes and product info</p>
          </div>
        )}

        {phase === 'photo_exact' && photoResult?.matchedProduct && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            <div className="flex w-full items-center gap-3">
              <img
                src={photoResult.matchedProduct.imageUrl ?? '/no-product.svg'}
                alt={photoResult.matchedProduct.name}
                className="size-12 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#18181b]">{photoResult.matchedProduct.name}</p>
                {photoResult.matchedProduct.brandName && (
                  <p className="truncate text-[12px] text-[#71717a]">{photoResult.matchedProduct.brandName}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-[#e1fee6] px-2 py-0.5 text-[11px] font-medium text-[#009636]">
                {Math.round(photoResult.confidence * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#71717a]">
              <Loader2 size={14} className="animate-spin" />
              Preparing analysis…
            </div>
          </div>
        )}

        {phase === 'photo_candidates' && photoResult && (
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-white/95 p-4 backdrop-blur-sm">
            <p className="text-center text-[14px] font-medium text-[#18181b]">Possible Matches</p>
            {photoResult.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCandidate(c)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#e4e4e7] bg-white p-2.5 text-left transition-colors hover:bg-[#fef4f2] active:bg-[#fce8e3]"
              >
                <img
                  src={c.imageUrl ?? '/no-product.svg'}
                  alt={c.name}
                  className="size-10 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#18181b]">{c.name}</p>
                  {c.brandName && <p className="truncate text-[11px] text-[#71717a]">{c.brandName}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-medium text-[#71717a]">
                  {Math.round(c.score * 100)}%
                </span>
              </button>
            ))}
            <div className="mt-1 flex w-full gap-2">
              <SecondaryButton onClick={handleRetry} className="flex-1 min-h-10 text-[13px]">
                <RefreshCw size={14} />
                Retry
              </SecondaryButton>
              <SecondaryButton onClick={() => navigate('/scan/ingredients')} className="flex-1 min-h-10 text-[13px]">
                Manual
              </SecondaryButton>
            </div>
          </div>
        )}

        {phase === 'photo_none' && (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white/95 p-5 backdrop-blur-sm">
            {photoResult?.extracted?.brand || photoResult?.extracted?.name ? (
              <>
                <Sparkles size={36} className="text-[#f97316]" />
                <p className="text-center text-[16px] font-medium text-[#18181b]">Product Detected</p>
                <p className="text-center text-[13px] leading-[18px] text-[#71717a]">
                  We identified the product but it's not in our database yet.
                </p>

                {/* Extracted info card */}
                <div className="mt-1 w-full rounded-xl bg-[#f4f4f5] p-3 space-y-1.5">
                  {photoResult.extracted.brand && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <Tag size={13} className="shrink-0 text-[#a1a1aa]" />
                      <span className="text-[#71717a]">Brand:</span>
                      <span className="font-medium text-[#18181b]">{photoResult.extracted.brand}</span>
                    </div>
                  )}
                  {photoResult.extracted.name && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <PackageSearch size={13} className="shrink-0 text-[#a1a1aa]" />
                      <span className="text-[#71717a]">Product:</span>
                      <span className="font-medium text-[#18181b]">{photoResult.extracted.name}</span>
                    </div>
                  )}
                  {photoResult.extracted.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {photoResult.extracted.attributes.map((attr, i) => (
                        <span key={i} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#71717a]">
                          {attr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-1 flex w-full gap-2">
                  <PrimaryButton
                    onClick={() => navigate('/scan/ingredients', {
                      state: {
                        prefill: {
                          brand: photoResult.extracted.brand,
                          name: photoResult.extracted.name,
                          attributes: photoResult.extracted.attributes,
                        },
                      },
                    })}
                    className="flex-1 min-h-10 text-[13px]"
                  >
                    <PlusCircle size={14} />
                    Add Product
                  </PrimaryButton>
                  <SecondaryButton onClick={handleRetry} className="flex-1 min-h-10 text-[13px]">
                    <RefreshCw size={14} />
                    Try Again
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <>
                <PackageSearch size={36} className="text-[#71717a]" />
                <p className="text-center text-[16px] font-medium text-[#18181b]">No Match Found</p>
                <p className="text-center text-[13px] leading-[18px] text-[#71717a]">
                  Couldn't identify this product from the photo. Try scanning its barcode instead.
                </p>
                <div className="mt-1 flex w-full gap-2">
                  <PrimaryButton onClick={handleRetry} className="flex-1 min-h-10 text-[13px]">
                    <RefreshCw size={14} />
                    Try Again
                  </PrimaryButton>
                  <SecondaryButton onClick={() => navigate('/scan/ingredients')} className="flex-1 min-h-10 text-[13px]">
                    Manual
                  </SecondaryButton>
                </div>
              </>
            )}
          </div>
        )}

        {/* Flashlight toggle + Photo capture */}
        {phase === 'scanning' && (
          <div className="mt-1 flex items-center gap-3">
            {scanning && (
              <button
                type="button"
                onClick={() => setTorchOn((v) => !v)}
                className="grid size-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
              >
                {torchOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
              </button>
            )}
            <button
              type="button"
              onClick={handlePhotoCapture}
              className="flex items-center gap-2 rounded-full bg-[#ee886e] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-colors hover:bg-[#e57f65] active:bg-[#d9745b]"
              aria-label="Take photo to identify product"
            >
              <Camera size={18} />
              Photo Scan
            </button>
          </div>
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
