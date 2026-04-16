import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bell, LinkIcon, Loader2, ScanLine, UserRound } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import {
  Chip,
  IconButton,
  SearchField,
  VerticalProductCard,
} from './shared'
import { fetchScanHistory, type ScanHistoryItem } from '../lib/scan-api'
import { addFavorite, fetchFavoriteIds, removeFavorite } from '../lib/favorites-api'
import { fetchProducts, type ProductListItem } from '../lib/products-api'
import { listInventoryItems } from '../lib/inventory-api'
import { getRoutines } from '../lib/routine-api'
import { useAuth } from '../contexts/auth-context'

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const CATEGORY_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Skincare', value: 'skincare' },
  { label: 'Makeup', value: 'makeup' },
  { label: 'Supplement', value: 'supplement' },
  { label: 'Other', value: 'other' },
] as const

const PAGE_SIZE = 20

function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const [searchQuery, setSearchQuery] = useState('')
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [inventoryCount, setInventoryCount] = useState<number | null>(null)
  const [routineUpdatedAt, setRoutineUpdatedAt] = useState<string | null>(null)

  // ─── Popular Products state ──────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined)
  const [popularProducts, setPopularProducts] = useState<ProductListItem[]>([])
  const [productsTotal, setProductsTotal] = useState(0)
  const [productsLoading, setProductsLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)

    const loadHistory = fetchScanHistory(userId, 10)
    const loadFavorites = fetchFavoriteIds(userId).catch(() => [] as string[])
    const loadInventory = listInventoryItems(userId).catch(() => [])
    const loadRoutines = getRoutines(userId).catch(() => [])

    Promise.all([loadHistory, loadFavorites, loadInventory, loadRoutines])
      .then(([historyRes, favIds, inventory, routines]) => {
        if (cancelled) return
        setScanHistory(historyRes.scans)
        setHistoryTotal(historyRes.total)
        setFavoriteIds(new Set(favIds))
        setInventoryCount(inventory.length)

        if (routines.length > 0) {
          const latest = routines.reduce((a, b) =>
            new Date(a.updatedAt) >= new Date(b.updatedAt) ? a : b,
          )
          setRoutineUpdatedAt(latest.updatedAt)
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load recent scans')
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  // ─── Load popular products (resets on category change) ───────────────────
  useEffect(() => {
    let cancelled = false
    setProductsLoading(true)
    setPopularProducts([])

    fetchProducts({ category: activeCategory, limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) return
        setPopularProducts(page.items)
        setProductsTotal(page.total)
      })
      .catch((e) => { toast.error(e instanceof Error ? e.message : 'Failed to load products') })
      .finally(() => {
        if (!cancelled) setProductsLoading(false)
      })

    return () => { cancelled = true }
  }, [activeCategory])

  const hasMore = popularProducts.length < productsTotal

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const page = await fetchProducts({
        category: activeCategory,
        limit: PAGE_SIZE,
        offset: popularProducts.length,
      })
      setPopularProducts((prev) => [...prev, ...page.items])
      setProductsTotal(page.total)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load more products')
    } finally {
      setLoadingMore(false)
    }
  }, [activeCategory, popularProducts.length, loadingMore, hasMore])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const handleToggleFavorite = useCallback(async (productId: string) => {
    const isFav = favoriteIds.has(productId)

    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(productId)
      else next.add(productId)
      return next
    })

    try {
      if (isFav) await removeFavorite(userId, productId)
      else await addFavorite(userId, productId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update favorite')
      // Revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(productId)
        else next.delete(productId)
        return next
      })
    }
  }, [favoriteIds])

  const handleSearch = useCallback(
    (query: string) => {
      navigate(`/search?q=${encodeURIComponent(query)}`)
    },
    [navigate],
  )

  return (
    <div className={`font-[Geist,'Avenir_Next','Segoe_UI',sans-serif]`}>
      <div className='bg-[#FEE7E1]'>
        <div className='p-4 pb-3 flex flex-row gap-6'>
          <div className='flex flex-col gap-2'>
            <p className='text-foreground text-2xl font-medium' style={{ letterSpacing: -0.6 }}>Welcome Back <span className='text-[#EE886E]'>{user?.fullName?.split(' ')[0] ?? 'there'}!</span></p>
            <p className='text-muted-foreground text-sm leading-[100%]'>
              {inventoryCount !== null ? `You own ${inventoryCount} products` : ''}
              {inventoryCount !== null && routineUpdatedAt ? ' · ' : ''}
              {routineUpdatedAt ? `Routine updated ${formatRelativeTime(routineUpdatedAt)}` : ''}
            </p>
          </div>
          <div className='flex flex-row gap-2.5'>
            <IconButton>
              <Bell size={18} />
            </IconButton>
            <IconButton onClick={() => navigate('/profile')}>
              <UserRound size={18} />
            </IconButton>
          </div>
        </div>

        <div className='pt-3 pb-5 px-4 flex flex-col gap-2.5'>
          <div className='flex flex-row gap-2.5'>
            <Button 
              type='button'
              variant="default"
              className='bg-[#EE886E] hover:bg-[#d9775d] flex-1'
              onClick={() => navigate('/scan')}
            >
              <ScanLine size={16} className='text-white' />
              <span className='text-white text-sm leading-5'>Scan a product</span>
            </Button>

            <Button 
              type='button'
              variant={"default"}
              className='bg-white hover:bg-[#f3f4f6] flex-1'
              onClick={() => navigate('/social')}
            >
              <LinkIcon size={16} className='text-black' />
              <span className='text-black text-sm leading-5'>Paste Link</span>
            </Button>
          </div>

          <SearchField
            placeholder="Search products..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
          />
        </div>
      </div>

      <section className='pt-5 px-4 flex flex-col flex-1 gap-3'>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] leading-none font-semibold">Last Scans</h2>
          {historyTotal > 10 && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-[14px] leading-[20px] text-[#71717a] no-underline hover:no-underline"
              onClick={() => navigate('/search?tab=history')}
            >
              See all
            </Button>
          )}
        </div>

        <div
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Last scans carousel"
        >
          {historyLoading ? (
            <div className="flex w-full items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#EE886E]" />
            </div>
          ) : scanHistory.length === 0 ? (
            <p className="w-full py-6 text-center text-sm text-[#71717a]">
              No scans yet. Scan your first product!
            </p>
          ) : (
            scanHistory.map((scan) => (
              <VerticalProductCard
                key={scan.id}
                item={{
                  name: scan.product?.name ?? 'Unknown Product',
                  subtitle: scan.product?.brandName ?? scan.barcodeValue ?? '',
                  tags: scan.product?.category ? [scan.product.category] : [],
                }}
                imageSrc={scan.product?.imageUrl ?? '/no-product.svg'}
                className="snap-start"
                isFavorited={scan.product?.id ? favoriteIds.has(scan.product.id) : false}
                onToggleFavorite={scan.product?.id ? () => handleToggleFavorite(scan.product!.id) : undefined}
                onPress={scan.product?.id ? () => navigate(`/product/${scan.product!.id}`) : undefined}
              />
            ))
          )}
        </div>
      </section>

      <section className='pt-5 px-4 flex flex-col flex-1 gap-3 pb-10'>
        <h2 className="text-[16px] leading-none font-semibold">Popular Products</h2>

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_FILTERS.map((cat) => (
            <Chip
              key={cat.label}
              active={activeCategory === cat.value}
              onClick={() => setActiveCategory(cat.value)}
            >
              {cat.label}
            </Chip>
          ))}
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#EE886E]" />
          </div>
        ) : popularProducts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#71717a]">
            No products found.
          </p>
        ) : (
          <div className='grid grid-cols-2 gap-3'>
            {popularProducts.map((p) => (
              <VerticalProductCard
                key={p.id}
                item={{
                  name: p.name,
                  subtitle: p.brandName ?? '',
                  tags: [p.category],
                }}
                imageSrc={p.imageUrl ?? '/no-product.svg'}
                className='w-auto min-w-[152px]'
                isFavorited={favoriteIds.has(p.id)}
                onToggleFavorite={() => handleToggleFavorite(p.id)}
                onPress={() => navigate(`/product/${p.id}`)}
              />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} className="flex justify-center py-2">
          {loadingMore && <Loader2 size={20} className="animate-spin text-[#EE886E]" />}
        </div>
      </section>

    </div>
  )
}

export default HomeScreen
