import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Barcode,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Loader2,
  PackageSearch,
  Pencil,
  ShieldAlert,
  Sparkles,
  Star,
} from '@skinory/ui/icons'
import { Badge } from '@skinory/ui/components/badge'
import { Button } from '@skinory/ui/components/button'
import { Input } from '@skinory/ui/components/input'
import { cn } from '@skinory/ui/lib/utils'
import { ScreenFrame } from './shared'
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

function comedogenicColor(rating: number | null): string {
  if (rating == null) return ''
  if (rating <= 1) return 'bg-green-100 text-green-700 border-green-200'
  if (rating <= 3) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-[15px] font-semibold text-[#18181b]">{children}</h2>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[13px] text-[#71717a] shrink-0">{label}</span>
      <span className="text-[13px] text-[#27272a] text-right">{value}</span>
    </div>
  )
}

function IngredientItem({ item, index }: { item: ProductIngredientDetail; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const name = item.displayName ?? item.rawLabel ?? item.inciName ?? `Ingredient #${index + 1}`
  const hasDetails = item.description || item.comedogenicRating != null || item.isPotentialAllergen || item.isActiveIngredient

  return (
    <div className="border-b border-[#f4f4f5] last:border-0">
      <button
        className="flex w-full items-center gap-2 py-2 text-left"
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
      >
        <span className="w-6 text-center text-[11px] text-[#a1a1aa] font-mono">{index + 1}</span>
        <span className="flex-1 text-[13px] text-[#27272a]">{name}</span>
        <div className="flex items-center gap-1">
          {item.isPotentialAllergen && (
            <Badge variant="outline" className="border-red-200 bg-red-50 px-1.5 py-0 text-[10px] text-red-600">
              <ShieldAlert className="mr-0.5 h-3 w-3" />Allergen
            </Badge>
          )}
          {item.isActiveIngredient && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] text-blue-600">
              <Sparkles className="mr-0.5 h-3 w-3" />Active
            </Badge>
          )}
          {item.comedogenicRating != null && item.comedogenicRating > 0 && (
            <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px]', comedogenicColor(item.comedogenicRating))}>
              C{item.comedogenicRating}
            </Badge>
          )}
          {hasDetails && (expanded ? <ChevronUp className="h-3.5 w-3.5 text-[#a1a1aa]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#a1a1aa]" />)}
        </div>
      </button>
      {expanded && (
        <div className="pb-2 pl-8 pr-2">
          {item.inciName && item.displayName && item.inciName !== item.displayName && (
            <p className="text-[12px] text-[#71717a]">INCI: {item.inciName}</p>
          )}
          {item.description && <p className="mt-1 text-[12px] text-[#52525b]">{item.description}</p>}
          {item.comedogenicRating != null && (
            <p className="mt-1 text-[12px] text-[#71717a]">
              Comedogenic: {comedogenicLabel(item.comedogenicRating)} ({item.comedogenicRating}/5)
            </p>
          )}
          {item.concentrationText && (
            <p className="mt-1 text-[12px] text-[#71717a]">Concentration: {item.concentrationText}</p>
          )}
        </div>
      )}
    </div>
  )
}

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
    return <InfoRow label={label} value={value} />
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-[13px] text-[#71717a]">{label}</span>
        <button
          className="flex items-center gap-1 text-[12px] text-[#ee886e] font-medium"
          onClick={() => { setEditing(true); setDraft('') }}
        >
          <Pencil className="h-3 w-3" />Add
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[13px] text-[#71717a] shrink-0">{label}</span>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-7 flex-1 text-[13px]"
        autoFocus
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        disabled={!draft.trim() || saving}
        onClick={() => { onSave(draft.trim()); setEditing(false) }}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </Button>
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

  // Fetch product data
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

  // Fetch favorite status
  useEffect(() => {
    if (!userId || !id) return
    fetchFavoriteIds(userId).then((ids) => setIsFavorite(ids.includes(id)))
  }, [userId, id])

  const toggleFavorite = useCallback(async () => {
    if (!userId || !id || favLoading) return
    setFavLoading(true)
    try {
      if (isFavorite) {
        await removeFavorite(userId, id)
        setIsFavorite(false)
      } else {
        await addFavorite(userId, id)
        setIsFavorite(true)
      }
    } finally {
      setFavLoading(false)
    }
  }, [userId, id, isFavorite, favLoading])

  const handleAddToInventory = useCallback(async () => {
    if (!userId || !id || inventoryLoading) return
    setInventoryLoading(true)
    try {
      await addToInventory(userId, id)
      setInventoryAdded(true)
    } finally {
      setInventoryLoading(false)
    }
  }, [userId, id, inventoryLoading])

  const handleUpdate = useCallback(async (field: 'description' | 'subcategory' | 'productForm', value: string) => {
    if (!userId || !id) return
    setSaving(true)
    try {
      const result = await updateProductDetail(userId, id, { [field]: value })
      setProduct((prev) => prev ? { ...prev, ...result } : prev)
    } finally {
      setSaving(false)
    }
  }, [userId, id])

  // ─── Loading / Error states ──────────────────────────────────────────────

  if (loading) {
    return (
      <ScreenFrame variant="paper">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ee886e]" />
        </div>
      </ScreenFrame>
    )
  }

  if (error || !product) {
    return (
      <ScreenFrame variant="paper">
        <div className="flex items-center gap-3 pt-4 pb-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 active:bg-black/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-[16px] font-semibold">Product</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <PackageSearch className="h-12 w-12 text-[#a1a1aa]" />
          <p className="text-[14px] text-[#71717a]">{error ?? 'Product not found'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </ScreenFrame>
    )
  }

  const ingredientCount = product.ingredients.length
  const visibleIngredients = showAllIngredients ? product.ingredients : product.ingredients.slice(0, 8)
  const obfSourceUrl = product.sources.find((s) => s.sourceUrl)?.sourceUrl
  const primaryBarcode = product.barcodes.find((b) => b.isPrimary)?.barcode ?? product.barcodes[0]?.barcode

  return (
    <ScreenFrame variant="paper" className="pb-28">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 active:bg-black/5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={toggleFavorite}
          disabled={favLoading || !userId}
          className="rounded-full p-1.5 active:bg-black/5"
        >
          <Heart className={cn('h-5 w-5 transition-colors', isFavorite ? 'fill-red-500 text-red-500' : 'text-[#71717a]')} />
        </button>
      </div>

      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pb-4">
        <div className="mb-3 h-36 w-36 overflow-hidden rounded-2xl bg-white shadow-sm">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f9ded7] to-[#f4cbc0]">
              <PackageSearch className="h-12 w-12 text-[#ee886e]/40" />
            </div>
          )}
        </div>
        <h1 className="text-center text-[18px] font-bold text-[#18181b] leading-tight">{product.name}</h1>
        {product.brand && (
          <p className="mt-0.5 text-[14px] text-[#71717a]">{product.brand.name}</p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {product.category && (
            <Badge variant="outline" className="rounded-full border-[#e4e4e7] bg-white px-2.5 py-0.5 text-[11px]">
              {product.category}
            </Badge>
          )}
          {product.sourceConfidence != null && (
            <Badge variant="outline" className="rounded-full border-[#e4e4e7] bg-white px-2.5 py-0.5 text-[11px]">
              {Math.round(product.sourceConfidence * 100)}% match
            </Badge>
          )}
        </div>
        {primaryBarcode && (
          <div className="mt-2 flex items-center gap-1 text-[12px] text-[#a1a1aa]">
            <Barcode className="h-3.5 w-3.5" />
            <span>{primaryBarcode}</span>
          </div>
        )}
      </div>

      {/* ─── Description ────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-3 mb-3">
        <SectionTitle>Description</SectionTitle>
        <EditableField
          label="Description"
          value={product.description}
          placeholder="Add a description..."
          onSave={(val) => handleUpdate('description', val)}
          saving={saving}
        />
      </div>

      {/* ─── Details ────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-3 mb-3">
        <SectionTitle>Details</SectionTitle>
        <InfoRow label="Category" value={product.category} />
        <EditableField
          label="Subcategory"
          value={product.subcategory}
          placeholder="e.g. Face wash"
          onSave={(val) => handleUpdate('subcategory', val)}
          saving={saving}
        />
        <EditableField
          label="Product Form"
          value={product.productForm}
          placeholder="e.g. Gel, Cream"
          onSave={(val) => handleUpdate('productForm', val)}
          saving={saving}
        />
        <InfoRow label="Source" value={product.sourceType} />

        {/* OBF extras */}
        {product.obfExtras.quantity && <InfoRow label="Quantity" value={String(product.obfExtras.quantity)} />}
        {product.obfExtras.packaging && <InfoRow label="Packaging" value={String(product.obfExtras.packaging)} />}
        {product.obfExtras.labels && <InfoRow label="Labels" value={String(product.obfExtras.labels)} />}
        {product.obfExtras.countries && <InfoRow label="Countries" value={String(product.obfExtras.countries)} />}
        {product.obfExtras.origins && <InfoRow label="Origins" value={String(product.obfExtras.origins)} />}
        {product.obfExtras.manufacturingPlaces && <InfoRow label="Manufacturing" value={String(product.obfExtras.manufacturingPlaces)} />}
      </div>

      {/* ─── Ingredients ────────────────────────────────────────────────── */}
      {ingredientCount > 0 && (
        <div className="rounded-xl bg-white p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <SectionTitle>Ingredients ({ingredientCount})</SectionTitle>
            <div className="flex gap-2 text-[11px] text-[#a1a1aa]">
              {product.ingredients.some((i) => i.isPotentialAllergen) && (
                <span className="flex items-center gap-0.5"><ShieldAlert className="h-3 w-3 text-red-400" />Allergen</span>
              )}
              {product.ingredients.some((i) => i.isActiveIngredient) && (
                <span className="flex items-center gap-0.5"><Sparkles className="h-3 w-3 text-blue-400" />Active</span>
              )}
            </div>
          </div>
          <div className="divide-y divide-[#f4f4f5]">
            {visibleIngredients.map((ing, i) => (
              <IngredientItem key={ing.id ?? i} item={ing} index={i} />
            ))}
          </div>
          {ingredientCount > 8 && (
            <button
              className="mt-2 w-full text-center text-[13px] font-medium text-[#ee886e]"
              onClick={() => setShowAllIngredients(!showAllIngredients)}
            >
              {showAllIngredients ? 'Show less' : `Show all ${ingredientCount} ingredients`}
            </button>
          )}
        </div>
      )}

      {ingredientCount === 0 && (
        <div className="rounded-xl bg-white p-3 mb-3">
          <SectionTitle>Ingredients</SectionTitle>
          <p className="text-[13px] text-[#a1a1aa] text-center py-3">No ingredient data available</p>
        </div>
      )}

      {/* ─── Barcodes ───────────────────────────────────────────────────── */}
      {product.barcodes.length > 1 && (
        <div className="rounded-xl bg-white p-3 mb-3">
          <SectionTitle>Barcodes</SectionTitle>
          <div className="space-y-1">
            {product.barcodes.map((b) => (
              <div key={b.barcode} className="flex items-center gap-2 text-[13px]">
                <Barcode className="h-3.5 w-3.5 text-[#a1a1aa]" />
                <span className="text-[#27272a] font-mono">{b.barcode}</span>
                {b.format && <span className="text-[11px] text-[#a1a1aa]">({b.format})</span>}
                {b.isPrimary && (
                  <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[10px]">Primary</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Source Info ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-3 mb-3">
        <SectionTitle>Data Sources</SectionTitle>
        {product.sources.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1">
            <div>
              <p className="text-[13px] text-[#27272a] capitalize">{s.sourceKind.replace(/_/g, ' ')}</p>
              <p className="text-[11px] text-[#a1a1aa]">{new Date(s.createdAt).toLocaleDateString()}</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'px-1.5 py-0 text-[10px]',
                s.scrapeStatus === 'completed' ? 'border-green-200 text-green-600' : 'border-amber-200 text-amber-600'
              )}
            >
              {s.scrapeStatus}
            </Badge>
          </div>
        ))}
        {obfSourceUrl && (
          <a
            href={obfSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-[12px] text-[#ee886e] font-medium"
          >
            <ExternalLink className="h-3 w-3" />View on Open Beauty Facts
          </a>
        )}
      </div>

      {/* ─── Sticky Action Bar ──────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e4e4e7] bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,8px)] pt-3">
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-1.5 rounded-full bg-[#ee886e] text-white hover:bg-[#e57a60]"
            onClick={() => navigate('/adviser/result', { state: { productId: id } })}
          >
            <Star className="h-4 w-4" />Analyze
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-full"
            onClick={handleAddToInventory}
            disabled={inventoryLoading || inventoryAdded || !userId}
          >
            {inventoryLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inventoryAdded ? (
              <><Check className="h-4 w-4 text-green-600" />Added</>
            ) : (
              'Add to Inventory'
            )}
          </Button>
        </div>
      </div>
    </ScreenFrame>
  )
}
