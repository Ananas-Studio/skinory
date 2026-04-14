import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Barcode,
  Check,
  ChevronDown,
  ChevronUp,
  Droplet,
  ExternalLink,
  Heart,
  Leaf,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
} from '@skinory/ui/icons'
import { Badge } from '@skinory/ui/components/badge'
import { Button } from '@skinory/ui/components/button'
import { Input } from '@skinory/ui/components/input'
import { cn } from '@skinory/ui/lib/utils'
import { useAuth } from '../contexts/auth-context'
import {
  fetchProductDetail,
  updateProductDetail,
  type ProductDetail,
  type ProductIngredientDetail,
} from '../lib/products-api'
import { addFavorite, removeFavorite, fetchFavoriteIds } from '../lib/favorites-api'
import { addToInventory } from '../lib/inventory-api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function comedogenicLabel(rating: number | null): string | null {
  if (rating == null) return null
  if (rating <= 1) return 'Low'
  if (rating <= 3) return 'Moderate'
  return 'High'
}

const COMEDOGENIC_STYLE: Record<string, string> = {
  Low: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Moderate: 'bg-amber-50 text-amber-600 border-amber-200',
  High: 'bg-rose-50 text-rose-500 border-rose-200',
}

// ─── Ingredient Pill ─────────────────────────────────────────────────────────

function IngredientPill({ item, index }: { item: ProductIngredientDetail; index: number }) {
  const [open, setOpen] = useState(false)
  const name = item.displayName ?? item.rawLabel ?? item.inciName ?? `#${index + 1}`
  const hasDetails = !!(item.description || item.comedogenicRating != null || item.isPotentialAllergen || item.isActiveIngredient)
  const isSpecial = item.isPotentialAllergen || item.isActiveIngredient || (item.comedogenicRating != null && item.comedogenicRating > 2)

  const pillBg = item.isPotentialAllergen
    ? 'bg-rose-50 border-rose-200'
    : item.isActiveIngredient
      ? 'bg-violet-50 border-violet-200'
      : 'bg-white border-[#ede8e6]'

  return (
    <div className="animate-in fade-in">
      <button
        onClick={() => hasDetails && setOpen(!open)}
        disabled={!hasDetails}
        className={cn(
          'relative flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-[12px] transition-all',
          pillBg,
          hasDetails && 'active:scale-[0.97]',
          open && 'ring-2 ring-[#ee886e]/20',
        )}
      >
        <span className="text-[10px] text-[#c4b5b0]">{index + 1}</span>
        <span className={cn('font-medium', isSpecial ? 'text-[#3f3f46]' : 'text-[#52525b]')}>{name}</span>
        {item.isPotentialAllergen && <ShieldAlert className="h-3 w-3 text-rose-400" />}
        {item.isActiveIngredient && <Sparkles className="h-3 w-3 text-violet-400" />}
        {hasDetails && (
          open ? <ChevronUp className="h-3 w-3 text-[#c4b5b0]" /> : <ChevronDown className="h-3 w-3 text-[#c4b5b0]" />
        )}
      </button>

      {open && (
        <div className="mt-1.5 ml-2 rounded-xl border border-[#f0ebe9] bg-[#fdfbfa] p-3 text-[12px] leading-relaxed text-[#52525b] animate-in slide-in-from-top-1">
          {item.inciName && item.displayName && item.inciName !== item.displayName && (
            <p className="mb-1 font-mono text-[11px] text-[#a1a1aa]">INCI: {item.inciName}</p>
          )}
          {item.description && <p>{item.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.isPotentialAllergen && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                <ShieldAlert className="h-2.5 w-2.5" />Potential Allergen
              </span>
            )}
            {item.isActiveIngredient && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                <Sparkles className="h-2.5 w-2.5" />Active Ingredient
              </span>
            )}
            {item.comedogenicRating != null && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                COMEDOGENIC_STYLE[comedogenicLabel(item.comedogenicRating) ?? ''] ?? 'bg-gray-50 text-gray-500 border-gray-200',
              )}>
                <Droplet className="h-2.5 w-2.5" />
                Comedogenic: {comedogenicLabel(item.comedogenicRating)} ({item.comedogenicRating}/5)
              </span>
            )}
          </div>
          {item.concentrationText && (
            <p className="mt-1.5 text-[11px] text-[#a1a1aa]">Concentration: {item.concentrationText}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Editable Inline Field ───────────────────────────────────────────────────

function EditableField({
  label,
  value,
  placeholder,
  onSave,
  saving,
}: {
  label: string
  value: string | null | undefined
  placeholder: string
  onSave: (val: string) => void
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (value) {
    return (
      <div className="flex items-start justify-between gap-3 py-2">
        <span className="text-[12px] font-medium tracking-wide uppercase text-[#b5a9a4]">{label}</span>
        <span className="text-[13px] text-[#3f3f46] text-right">{value}</span>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-[12px] font-medium tracking-wide uppercase text-[#b5a9a4]">{label}</span>
        <button
          className="flex items-center gap-1 rounded-full border border-dashed border-[#ee886e]/40 px-2.5 py-1 text-[11px] font-medium text-[#ee886e] transition-colors hover:bg-[#ee886e]/5"
          onClick={() => { setEditing(true); setDraft('') }}
        >
          <Plus className="h-3 w-3" />Add info
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-8 flex-1 rounded-xl border-[#ede8e6] bg-white text-[13px] focus-visible:ring-[#ee886e]/30"
        autoFocus
      />
      <button
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ee886e] text-white transition-opacity disabled:opacity-40"
        disabled={!draft.trim() || saving}
        onClick={() => { onSave(draft.trim()); setEditing(false) }}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ─── Stat Bubble ─────────────────────────────────────────────────────────────

function StatBubble({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 min-w-[80px]', color)}>
      {icon}
      <span className="text-[15px] font-bold leading-none">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</span>
    </div>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userId } = useAuth()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryAdded, setInventoryAdded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAllIngredients, setShowAllIngredients] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProductDetail(id)
      .then((data) => { if (!cancelled) setProduct(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!userId || !id) return
    fetchFavoriteIds(userId).then((ids) => setIsFavorite(ids.includes(id)))
  }, [userId, id])

  const toggleFavorite = useCallback(async () => {
    if (!userId || !id || favLoading) return
    setFavLoading(true)
    try {
      if (isFavorite) { await removeFavorite(userId, id); setIsFavorite(false) }
      else { await addFavorite(userId, id); setIsFavorite(true) }
    } finally { setFavLoading(false) }
  }, [userId, id, isFavorite, favLoading])

  const handleAddToInventory = useCallback(async () => {
    if (!userId || !id || inventoryLoading) return
    setInventoryLoading(true)
    try { await addToInventory(userId, id); setInventoryAdded(true) }
    finally { setInventoryLoading(false) }
  }, [userId, id, inventoryLoading])

  const handleUpdate = useCallback(async (field: 'description' | 'subcategory' | 'productForm', value: string) => {
    if (!userId || !id) return
    setSaving(true)
    try {
      const result = await updateProductDetail(userId, id, { [field]: value })
      setProduct((prev) => prev ? { ...prev, ...result } : prev)
    } finally { setSaving(false) }
  }, [userId, id])

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#fdf8f6] font-[Geist,'Avenir_Next','Segoe_UI',sans-serif]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-[3px] border-[#f4e0da] border-t-[#ee886e] animate-spin" />
          <Droplet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-[#ee886e]" />
        </div>
        <p className="mt-4 text-[13px] text-[#b5a9a4]">Loading product...</p>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="relative flex min-h-screen flex-col bg-[#fdf8f6] px-5 font-[Geist,'Avenir_Next','Segoe_UI',sans-serif]">
        <div className="flex items-center gap-3 pt-5 pb-6">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/80 backdrop-blur active:scale-95 transition-transform">
            <ArrowLeft className="h-[18px] w-[18px] text-[#3f3f46]" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-20 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#f4e0da]">
            <PackageSearch className="h-9 w-9 text-[#ee886e]" />
          </div>
          <p className="text-[15px] font-medium text-[#3f3f46]">Oops!</p>
          <p className="text-[13px] text-[#a1a1aa] max-w-[240px]">{error ?? 'We couldn\'t find this product. It may have been removed.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-2 rounded-full bg-[#ee886e] px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#ee886e]/20 active:scale-95 transition-transform"
          >
            Go Back
          </button>
        </div>
      </main>
    )
  }

  // ─── Computed values ─────────────────────────────────────────────────────

  const ingredientCount = product.ingredients.length
  const allergenCount = product.ingredients.filter((i) => i.isPotentialAllergen).length
  const activeCount = product.ingredients.filter((i) => i.isActiveIngredient).length
  const visibleIngredients = showAllIngredients ? product.ingredients : product.ingredients.slice(0, 10)
  const obfSourceUrl = product.sources.find((s) => s.sourceUrl)?.sourceUrl
  const primaryBarcode = product.barcodes.find((b) => b.isPrimary)?.barcode ?? product.barcodes[0]?.barcode

  const detailChips: { label: string; value: string }[] = []
  if (product.category) detailChips.push({ label: 'Category', value: product.category })
  if (product.subcategory) detailChips.push({ label: 'Type', value: product.subcategory })
  if (product.productForm) detailChips.push({ label: 'Form', value: product.productForm })
  if (product.obfExtras.quantity) detailChips.push({ label: 'Size', value: String(product.obfExtras.quantity) })
  if (product.obfExtras.labels) detailChips.push({ label: 'Labels', value: String(product.obfExtras.labels) })
  if (product.obfExtras.countries) detailChips.push({ label: 'Countries', value: String(product.obfExtras.countries) })
  if (product.obfExtras.origins) detailChips.push({ label: 'Origins', value: String(product.obfExtras.origins) })
  if (product.obfExtras.packaging) detailChips.push({ label: 'Packaging', value: String(product.obfExtras.packaging) })

  return (
    <main className="relative min-h-screen bg-[#fdf8f6] pb-32 font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] text-[#18181b]">

      {/* ━━━ Hero gradient header ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#fbe9e4] via-[#fdf2ef] to-[#fdf8f6] pb-6">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#ee886e]/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 -left-20 h-40 w-40 rounded-full bg-[#f4cbc0]/30 blur-2xl" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
          <button
            onClick={() => navigate(-1)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/70 backdrop-blur-md shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-[18px] w-[18px] text-[#3f3f46]" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.share?.({ title: product.name, url: window.location.href }).catch(() => {})
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/70 backdrop-blur-md shadow-sm active:scale-95 transition-transform"
            >
              <Share2 className="h-[18px] w-[18px] text-[#71717a]" />
            </button>
            <button
              onClick={toggleFavorite}
              disabled={favLoading || !userId}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-full backdrop-blur-md shadow-sm active:scale-95 transition-all',
                isFavorite ? 'bg-rose-50 shadow-rose-100' : 'bg-white/70',
              )}
            >
              <Heart
                className={cn(
                  'h-[18px] w-[18px] transition-all',
                  isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-[#71717a]',
                )}
              />
            </button>
          </div>
        </div>

        {/* Product image with floating effect */}
        <div className="relative z-10 flex flex-col items-center px-5 pt-2">
          <div className="relative">
            <div className="absolute inset-3 rounded-3xl bg-[#ee886e]/8 blur-xl" />
            <div className="relative h-44 w-44 overflow-hidden rounded-3xl border-2 border-white/60 bg-white shadow-xl shadow-[#ee886e]/10">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-2" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fbe9e4] to-[#f4cbc0]">
                  <Droplet className="h-14 w-14 text-[#ee886e]/25" />
                </div>
              )}
            </div>
          </div>

          {/* Brand pill */}
          {product.brand && (
            <div className="mt-4 rounded-full bg-white/80 px-4 py-1 text-[12px] font-semibold tracking-wide text-[#b5a9a4] uppercase shadow-sm backdrop-blur">
              {product.brand.name}
            </div>
          )}

          {/* Product name */}
          <h1 className="mt-2.5 text-center text-[20px] font-bold leading-tight text-[#1a1a1a] max-w-[280px]">
            {product.name}
          </h1>

          {/* Category & confidence */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {product.category && (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#ee886e] shadow-sm border border-[#ee886e]/15">
                {product.category}
              </span>
            )}
            {product.sourceConfidence != null && (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#71717a] shadow-sm border border-[#e4e4e7]">
                ✨ {Math.round(product.sourceConfidence * 100)}% match
              </span>
            )}
          </div>

          {primaryBarcode && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#c4b5b0]">
              <Barcode className="h-3 w-3" />
              <span className="font-mono">{primaryBarcode}</span>
            </div>
          )}
        </div>
      </div>

      {/* ━━━ Quick Stats ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {ingredientCount > 0 && (
        <div className="flex justify-center gap-3 -mt-1 px-5">
          <StatBubble
            icon={<Leaf className="h-4 w-4" />}
            label="Ingredients"
            value={ingredientCount}
            color="bg-emerald-50 border-emerald-100 text-emerald-600"
          />
          {activeCount > 0 && (
            <StatBubble
              icon={<Sparkles className="h-4 w-4" />}
              label="Actives"
              value={activeCount}
              color="bg-violet-50 border-violet-100 text-violet-600"
            />
          )}
          {allergenCount > 0 && (
            <StatBubble
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Allergens"
              value={allergenCount}
              color="bg-rose-50 border-rose-100 text-rose-500"
            />
          )}
          {product.sourceConfidence != null && (
            <StatBubble
              icon={<Star className="h-4 w-4" />}
              label="Confidence"
              value={`${Math.round(product.sourceConfidence * 100)}%`}
              color="bg-amber-50 border-amber-100 text-amber-600"
            />
          )}
        </div>
      )}

      {/* ━━━ Content sections ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mt-5 flex flex-col gap-3 px-4">

        {/* ── Description ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[#f0ebe9] bg-white p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#b5a9a4]">
            <span className="h-1 w-1 rounded-full bg-[#ee886e]" />About
          </h2>
          {product.description ? (
            <p className="text-[14px] leading-relaxed text-[#3f3f46]">{product.description}</p>
          ) : (
            <EditableField
              label=""
              value={null}
              placeholder="Add a description for this product..."
              onSave={(val) => handleUpdate('description', val)}
              saving={saving}
            />
          )}
        </section>

        {/* ── Details (chip grid) ────────────────────────────────────── */}
        {(detailChips.length > 0 || !product.subcategory || !product.productForm) && (
          <section className="rounded-2xl border border-[#f0ebe9] bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#b5a9a4]">
              <span className="h-1 w-1 rounded-full bg-[#ee886e]" />Details
            </h2>
            {detailChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {detailChips.map((chip) => (
                  <div key={chip.label} className="rounded-xl bg-[#fdf8f6] border border-[#f0ebe9] px-3 py-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[#c4b5b0]">{chip.label}</p>
                    <p className="text-[13px] font-medium text-[#3f3f46] mt-0.5">{chip.value}</p>
                  </div>
                ))}
              </div>
            )}

            {!product.subcategory && (
              <EditableField label="Subcategory" value={null} placeholder="e.g. Face wash, Moisturizer" onSave={(val) => handleUpdate('subcategory', val)} saving={saving} />
            )}
            {!product.productForm && (
              <EditableField label="Product Form" value={null} placeholder="e.g. Gel, Cream, Serum" onSave={(val) => handleUpdate('productForm', val)} saving={saving} />
            )}
          </section>
        )}

        {/* ── Ingredients ────────────────────────────────────────────── */}
        {ingredientCount > 0 ? (
          <section className="rounded-2xl border border-[#f0ebe9] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#b5a9a4]">
                <span className="h-1 w-1 rounded-full bg-[#ee886e]" />
                Ingredients
                <span className="ml-1 rounded-full bg-[#fdf8f6] px-2 py-0.5 text-[11px] font-semibold text-[#ee886e]">
                  {ingredientCount}
                </span>
              </h2>
              <div className="flex gap-1.5">
                {allergenCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-rose-400">
                    <ShieldAlert className="h-3 w-3" />{allergenCount}
                  </span>
                )}
                {activeCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-violet-400">
                    <Sparkles className="h-3 w-3" />{activeCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleIngredients.map((ing, i) => (
                <IngredientPill key={ing.id ?? i} item={ing} index={i} />
              ))}
            </div>

            {ingredientCount > 10 && (
              <button
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#ee886e]/30 py-2 text-[12px] font-semibold text-[#ee886e] transition-colors hover:bg-[#ee886e]/5"
                onClick={() => setShowAllIngredients(!showAllIngredients)}
              >
                {showAllIngredients ? (
                  <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>See all {ingredientCount} ingredients <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-[#ede8e6] bg-white/60 p-5 text-center">
            <Leaf className="mx-auto h-8 w-8 text-[#d4c8c3]" />
            <p className="mt-2 text-[13px] text-[#b5a9a4]">No ingredient data yet</p>
            <p className="text-[11px] text-[#d4c8c3]">Scan the ingredient list to add them</p>
          </section>
        )}

        {/* ── Barcodes ───────────────────────────────────────────────── */}
        {product.barcodes.length > 1 && (
          <section className="rounded-2xl border border-[#f0ebe9] bg-white p-4 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#b5a9a4]">
              <span className="h-1 w-1 rounded-full bg-[#ee886e]" />Barcodes
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.barcodes.map((b) => (
                <div
                  key={b.barcode}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl border px-3 py-1.5',
                    b.isPrimary ? 'border-[#ee886e]/20 bg-[#fdf8f6]' : 'border-[#f0ebe9] bg-white',
                  )}
                >
                  <Barcode className="h-3 w-3 text-[#c4b5b0]" />
                  <span className="font-mono text-[12px] text-[#3f3f46]">{b.barcode}</span>
                  {b.isPrimary && <span className="text-[9px] font-bold uppercase text-[#ee886e]">Primary</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Source info ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[#f0ebe9] bg-white p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-[#b5a9a4]">
            <span className="h-1 w-1 rounded-full bg-[#ee886e]" />Sources
          </h2>
          <div className="space-y-2">
            {product.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-[#fdf8f6] px-3 py-2">
                <div>
                  <p className="text-[12px] font-medium text-[#3f3f46] capitalize">{s.sourceKind.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-[#c4b5b0]">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  s.scrapeStatus === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500',
                )}>
                  {s.scrapeStatus}
                </span>
              </div>
            ))}
          </div>
          {obfSourceUrl && (
            <a
              href={obfSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[#f0ebe9] py-2 text-[12px] font-semibold text-[#ee886e] transition-colors hover:bg-[#ee886e]/5"
            >
              <ExternalLink className="h-3.5 w-3.5" />View on Open Beauty Facts
            </a>
          )}
        </section>

        {/* Extra bottom space above action bar */}
        <div className="h-2" />
      </div>

      {/* ━━━ Sticky Action Bar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white via-white/98 to-white/0 px-4 pb-[env(safe-area-inset-bottom,10px)] pt-5">
        <div className="flex gap-2.5">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ee886e] to-[#e8725a] py-3.5 text-[14px] font-bold text-white shadow-lg shadow-[#ee886e]/25 active:scale-[0.98] transition-transform"
            onClick={() => navigate('/adviser/result', { state: { productId: id } })}
          >
            <Sparkles className="h-4 w-4" />Analyze for Me
          </button>
          <button
            className={cn(
              'grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border-2 transition-all active:scale-95',
              inventoryAdded
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-[#ede8e6] bg-white',
            )}
            onClick={handleAddToInventory}
            disabled={inventoryLoading || inventoryAdded || !userId}
          >
            {inventoryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#ee886e]" />
            ) : inventoryAdded ? (
              <Check className="h-5 w-5 text-emerald-500" />
            ) : (
              <Plus className="h-5 w-5 text-[#71717a]" />
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
