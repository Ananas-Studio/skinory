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

  const productId = state?.productId ?? ''
  const productName = state?.prefill?.name ?? state?.productName ?? 'Unknown Product'
  const barcode = state?.barcode ?? ''
  const prefill = state?.prefill ?? null

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [screenState, setScreenState] = useState<ScreenState>('capture')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrIngredientsResult | null>(null)
  const [editedText, setEditedText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelected = useCallback(
    async (file: File) => {
      // Revoke previous URL
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
      } catch (err: any) {
        setErrorMessage(err.message ?? 'Failed to extract ingredients')
        toast.error(err.message ?? 'Failed to extract ingredients')
        setScreenState('error')
      }
    },
    [previewUrl],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    // Reset input value so the same file can be re-selected
    e.target.value = ''
  }

  function handleRetake() {
    setScreenState('capture')
    setImageFile(null)
    setOcrResult(null)
    setEditedText('')
    setErrorMessage('')
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
      handleFileSelected(imageFile)
    } else {
      handleRetake()
    }
  }

  // ── Capture Mode ─────────────────────────────────────────────────────────

  if (screenState === 'capture') {
    return (
      <ScreenFrame variant="camera">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
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

        {/* Viewfinder area */}
        <section className="mt-6 flex flex-1 flex-col items-center justify-center">
          <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-[24px] border-4 border-dashed border-white/60">
            <Camera size={48} className="text-white/70" />
            <p className="mt-4 px-8 text-center text-[14px] leading-[20px] text-white/90">
              Take a clear photo of the ingredient list on the product packaging
            </p>
          </div>
        </section>

        {/* Action buttons */}
        <section className="mt-auto flex flex-col gap-3 pb-8">
          <PrimaryButton
            onClick={() => cameraInputRef.current?.click()}
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
