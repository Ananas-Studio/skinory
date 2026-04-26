import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RefreshCw,
} from '@skinory/ui/icons'
import { Badge } from '@skinory/ui/components/badge'
import { IconButton, PrimaryButton, ScreenFrame, SecondaryButton } from './shared'
import {
  evaluateProduct,
  ocrIngredients,
  saveIngredients,
  createProduct,
  type OcrIngredientsResult,
} from '../lib/scan-api'
import { useAuth } from '../contexts/auth-context'

type ScreenState = 'capture' | 'processing' | 'review' | 'saving' | 'error'

interface LocationState {
  productId?: string
  productName?: string
  barcode?: string
  prefill?: {
    brand: string | null
    name: string | null
    attributes: string[]
  }
  /** Legacy: raw product object from ScanScreen (fallback) */
  product?: {
    id?: string
    name?: string | null
    barcode?: string
    brand?: string | null
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProductInfoBar({ name, barcode, brand }: { name: string; barcode: string; brand?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-[#e4e4e7] bg-white p-3">
      <div className="h-10 w-10 shrink-0 rounded-[8px] bg-[linear-gradient(145deg,#f9ded7,#f4cbc0)]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] leading-[18px] font-medium text-[#18181b]">{name}</p>
        <p className="mt-0.5 text-[12px] leading-[16px] text-[#71717a]">
          {barcode ? `Barcode: ${barcode}` : brand ?? 'Photo scan'}
        </p>
      </div>
    </div>
  )
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 80 ? 'text-[#009636]' : pct >= 50 ? 'text-[#b16900]' : 'text-[#d42b2b]'
  const bg = pct >= 80 ? 'bg-[#e1fee6]' : pct >= 50 ? 'bg-[#fef4e1]' : 'bg-[#fee1e1]'

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full ${bg} px-3 py-1`}>
      <span className={`text-[12px] font-medium ${color}`}>Confidence: {pct}%</span>
    </div>
  )
}

function ImagePreview({ src }: { src: string }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#e4e4e7]">
      <img src={src} alt="Captured ingredient list" className="h-[140px] w-full object-cover" />
    </div>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

function IngredientCaptureScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const state = location.state as LocationState | null

  const productId = state?.productId ?? state?.product?.id ?? ''
  const productName = state?.prefill?.name ?? state?.productName ?? state?.product?.name ?? 'Unknown Product'
  const barcode = state?.barcode ?? state?.product?.barcode ?? ''
  const prefill = state?.prefill ?? (state?.product ? { brand: state.product.brand ?? null, name: state.product.name ?? null, attributes: [] } : null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [screenState, setScreenState] = useState<ScreenState>('capture')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrIngredientsResult | null>(null)
  const [editedText, setEditedText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Start camera when in capture mode
  useEffect(() => {
    if (screenState !== 'capture') return

    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
          setCameraError('')
        }
      } catch {
        if (!cancelled) {
          setCameraError('Camera access denied. Use Upload Photo instead.')
          setCameraReady(false)
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      setCameraReady(false)
    }
  }, [screenState])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const processFile = useCallback(
    async (file: File) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)

      const url = URL.createObjectURL(file)
      setImageFile(file)
      setPreviewUrl(url)
      setScreenState('processing')
      setErrorMessage('')

      try {
        const result = await ocrIngredients(userId, file)
        setOcrResult(result)
        setEditedText(result.ocrText)
        setScreenState('review')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to extract ingredients'
        setErrorMessage(msg)
        toast.error(msg)
        setScreenState('error')
      }
    },
    [previewUrl, userId],
  )

  function handleTakePhoto() {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    // Capture frame BEFORE stopping the camera — on mobile, stopping tracks
    // can blank the video element immediately.
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    // Now safe to stop the camera stream.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Failed to capture photo. Please try again.')
          return
        }
        const file = new File([blob], 'ingredient-photo.jpg', { type: 'image/jpeg' })
        processFile(file).catch((err) => {
          console.error('[IngredientCapture] processFile error:', err)
          toast.error('Something went wrong processing the photo')
        })
      },
      'image/jpeg',
      0.92,
    )
  }

  function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Stop camera when uploading
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      processFile(file)
    }
    e.target.value = ''
  }

  function handleRetake() {
    setScreenState('capture')
    setImageFile(null)
    setOcrResult(null)
    setEditedText('')
    setErrorMessage('')
    setCameraReady(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function handleConfirm() {
    if (!editedText.trim()) return

    setScreenState('saving')
    setErrorMessage('')

    try {
      let resolvedProductId = productId

      // If no productId, create the product first (photo scan flow)
      if (!resolvedProductId && prefill?.name) {
        const created = await createProduct(userId, {
          name: prefill.name,
          brand: prefill.brand ?? undefined,
          attributes: prefill.attributes,
        })
        resolvedProductId = created.id
      }

      if (!resolvedProductId) {
        throw new Error('No product to save ingredients for')
      }

      await saveIngredients(userId, resolvedProductId, editedText.trim())
      const evalResult = await evaluateProduct(userId, resolvedProductId)
      navigate('/adviser/result', { state: { productId: resolvedProductId, result: evalResult } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save ingredients'
      setErrorMessage(msg)
      toast.error(msg)
      setScreenState('error')
    }
  }

  function handleRetry() {
    if (imageFile) {
      processFile(imageFile)
    } else {
      handleRetake()
    }
  }

  // ── Capture Mode ─────────────────────────────────────────────────────────

  if (screenState === 'capture') {
    return (
      <ScreenFrame variant="camera">
        {/* Hidden upload input (fallback) */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Header */}
        <section className="flex items-center gap-3 pt-4">
          <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-white/40 bg-white/20">
            <ArrowLeft size={16} className="text-white" />
          </IconButton>
          <h1 className="flex-1 text-[16px] leading-none font-semibold text-white">
            Add Ingredients
          </h1>
        </section>

        {/* Product info */}
        <section className="mt-4">
          <ProductInfoBar name={productName} barcode={barcode} brand={prefill?.brand} />
        </section>

        {/* Live camera viewfinder */}
        <section className="relative mt-6 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[24px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Overlay guide frame */}
          <div className="relative z-10 flex h-[280px] w-full flex-col items-center justify-center rounded-[24px] border-4 border-dashed border-white/60">
            {!cameraReady && !cameraError && (
              <Loader2 size={36} className="animate-spin text-white/70" />
            )}
            {cameraError && (
              <p className="px-8 text-center text-[14px] text-white/90">{cameraError}</p>
            )}
            {cameraReady && (
              <p className="px-8 text-center text-[14px] leading-[20px] text-white/90">
                Point at the ingredient list and tap Take Photo
              </p>
            )}
          </div>
        </section>

        {/* Action buttons */}
        <section className="mt-auto flex flex-col gap-3 pb-8">
          <PrimaryButton
            onClick={handleTakePhoto}
            disabled={!cameraReady}
            className="w-full"
          >
            <Camera size={18} />
            Take Photo
          </PrimaryButton>
          <SecondaryButton
            onClick={() => uploadInputRef.current?.click()}
            className="w-full"
          >
            <ImagePlus size={18} />
            Upload Photo
          </SecondaryButton>
        </section>
      </ScreenFrame>
    )
  }

  // ── Processing Mode ──────────────────────────────────────────────────────

  if (screenState === 'processing') {
    return (
      <ScreenFrame>
        <section className="flex flex-1 flex-col items-center justify-center gap-4">
          {previewUrl ? (
            <div className="h-[120px] w-[120px] overflow-hidden rounded-[16px] border border-[#e4e4e7]">
              <img src={previewUrl} alt="Captured" className="size-full object-cover" />
            </div>
          ) : null}
          <Loader2 size={40} className="animate-spin text-[#ee886e]" />
          <p className="text-[16px] font-medium text-[#3f3f46]">Extracting ingredients…</p>
          <p className="text-[14px] text-[#71717a]">This may take a few seconds</p>
        </section>
      </ScreenFrame>
    )
  }

  // ── Review Mode ──────────────────────────────────────────────────────────

  if (screenState === 'review' && ocrResult) {
    return (
      <ScreenFrame variant="paper">
        {/* Header */}
        <section className="flex items-center gap-3 pt-4">
          <IconButton onClick={() => navigate(-1)} className="size-[32px] rounded-[6px] border border-[#e4e4e7] bg-white">
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="flex-1 text-[16px] leading-none font-semibold text-[#18181b]">
            Review Ingredients
          </h1>
        </section>

        {/* Scrollable content */}
        <div className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto pb-[160px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Image preview + confidence */}
          {previewUrl ? <ImagePreview src={previewUrl} /> : null}
          <ConfidenceIndicator confidence={ocrResult.confidence} />

          {/* Editable text */}
          <div className="flex flex-col gap-2">
            <label htmlFor="ingredients-text" className="text-[14px] font-medium text-[#18181b]">
              Extracted Text
            </label>
            <textarea
              id="ingredients-text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={6}
              className="w-full rounded-[12px] border border-[#e4e4e7] bg-white px-3 py-2 text-[14px] leading-[20px] text-[#3f3f46] outline-none transition-colors focus:border-[#ee886e] focus:ring-2 focus:ring-[#ee886e]/20"
            />
            <p className="text-[12px] text-[#71717a]">
              You can edit the text above if the extraction isn't accurate.
            </p>
          </div>

          {/* Parsed ingredient chips */}
          {ocrResult.ingredients.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-medium text-[#18181b]">
                Detected Ingredients ({ocrResult.ingredients.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ocrResult.ingredients.map((ing) => (
                  <Badge
                    key={`${ing.order}-${ing.inciName}`}
                    variant="outline"
                    className="rounded-full border-[#e4e4e7] bg-white px-2.5 py-1 text-[12px] font-normal text-[#3f3f46]"
                  >
                    {ing.rawLabel || ing.inciName}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Fixed bottom action bar */}
        <section className="absolute right-0 bottom-0 left-0 flex flex-col gap-2.5 border-t border-[#e4e4e7] bg-white px-4 pt-3 pb-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <PrimaryButton onClick={handleConfirm} className="w-full">
            <Check size={18} />
            Confirm &amp; Analyze
          </PrimaryButton>
          <SecondaryButton onClick={handleRetake} className="w-full">
            <RefreshCw size={18} />
            Retake Photo
          </SecondaryButton>
        </section>
      </ScreenFrame>
    )
  }

  // ── Saving Mode ──────────────────────────────────────────────────────────

  if (screenState === 'saving') {
    return (
      <ScreenFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#ee886e]" />
          <p className="text-[16px] font-medium text-[#3f3f46]">Saving ingredients…</p>
          <p className="text-[14px] text-[#71717a]">Preparing analysis</p>
        </div>
      </ScreenFrame>
    )
  }

  // ── Error Mode ───────────────────────────────────────────────────────────

  return (
    <ScreenFrame>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
        <AlertCircle size={40} className="text-[#d42b2b]" />
        <p className="text-center text-[16px] font-medium text-[#3f3f46]">Something Went Wrong</p>
        <p className="text-center text-[14px] text-[#71717a]">{errorMessage}</p>
        <div className="flex flex-col gap-2.5 w-full mt-2">
          <PrimaryButton onClick={handleRetry} className="w-full">
            <RefreshCw size={18} />
            Try Again
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate(-1)} className="w-full">
            <ArrowLeft size={18} />
            Go Back
          </SecondaryButton>
        </div>
      </div>
    </ScreenFrame>
  )
}

export default IngredientCaptureScreen
