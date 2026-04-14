import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@skinory/ui/components/button'
import { Loader2 } from '@skinory/ui/icons'
import { HorizontalProductCard, ScreenFrame, SearchField } from './shared'
import { listInventoryItems, type InventoryItem } from '../lib/inventory-api'
import { fetchFavorites, type FavoriteItem } from '../lib/favorites-api'
import { fetchScanHistory, type ScanHistoryItem } from '../lib/scan-api'
import type { Product } from './types'
import { useAuth } from '../contexts/auth-context'

type InventoryTabKey = 'products' | 'wishlist' | 'history'

// ─── Unified card shape ──────────────────────────────────────────────────────

interface CardItem {
  product: Product
  imageUrl: string
  productId?: string
}

function inventoryToCard(item: InventoryItem): CardItem {
  return {
    product: {
      name: item.productName,
      subtitle: item.brandName ?? item.category,
      tags: [item.category],
    },
    imageUrl: item.imageUrl ?? '/introduction-image.png',
    productId: item.productId,
  }
}

function favoriteToCard(item: FavoriteItem): CardItem {
  return {
    product: {
      name: item.product?.name ?? 'Unknown Product',
      subtitle: item.product?.brandName ?? item.product?.category ?? '',
      tags: item.product?.category ? [item.product.category] : [],
    },
    imageUrl: item.product?.imageUrl ?? '/introduction-image.png',
    productId: item.productId,
  }
}

function scanToCard(item: ScanHistoryItem): CardItem {
  return {
    product: {
      name: item.product?.name ?? 'Unknown Product',
      subtitle: item.product?.brandName ?? item.barcodeValue ?? '',
      tags: item.product?.category ? [item.product.category] : [],
    },
    imageUrl: item.product?.imageUrl ?? '/introduction-image.png',
    productId: item.product?.id,
  }
}

// ─── Tab-specific empty states ───────────────────────────────────────────────

const emptyStates: Record<InventoryTabKey, { title: string; hint: string }> = {
  products: {
    title: 'No products in your inventory yet.',
    hint: 'Scan a product and tap "Add to Inventory"',
  },
  wishlist: {
    title: 'Your wishlist is empty.',
    hint: 'Tap the heart icon on products to save them here',
  },
  history: {
    title: 'No scan history yet.',
    hint: 'Scan your first product to see it here',
  },
}

function InventoryScreen() {
  const { user } = useAuth()
  const userId = user!.id
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<InventoryTabKey>('products')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const listRef = useRef<HTMLElement | null>(null)

  // Raw data per tab
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([])
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([])

  // Track which tabs have been loaded
  const [loaded, setLoaded] = useState<Record<InventoryTabKey, boolean>>({
    products: false,
    wishlist: false,
    history: false,
  })

  const fetchTab = useCallback(async (tab: InventoryTabKey) => {
    setLoading(true)
    try {
      if (tab === 'products') {
        const items = await listInventoryItems(userId)
        setInventoryItems(items)
      } else if (tab === 'wishlist') {
        const res = await fetchFavorites(userId)
        setFavoriteItems(res.favorites)
      } else {
        const res = await fetchScanHistory(userId, 100)
        setHistoryItems(res.scans)
      }
      setLoaded((prev) => ({ ...prev, [tab]: true }))
    } catch {
      // Keep previous data on error
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // Fetch on tab change if not already loaded
    if (!loaded[activeTab]) {
      fetchTab(activeTab)
    }
  }, [activeTab, loaded, fetchTab])

  // Initial load
  useEffect(() => {
    fetchTab('products')
  }, [fetchTab])

  // Map to card items based on active tab
  const cards = useMemo(() => {
    let items: CardItem[]
    if (activeTab === 'products') items = inventoryItems.map(inventoryToCard)
    else if (activeTab === 'wishlist') items = favoriteItems.map(favoriteToCard)
    else items = historyItems.map(scanToCard)

    if (!searchQuery.trim()) return items

    const q = searchQuery.toLowerCase()
    return items.filter(
      (c) =>
        c.product.name.toLowerCase().includes(q) ||
        c.product.subtitle.toLowerCase().includes(q),
    )
  }, [activeTab, inventoryItems, favoriteItems, historyItems, searchQuery])

  const handleTabChange = useCallback((tab: InventoryTabKey) => {
    setActiveTab(tab)
    setSearchQuery('')
  }, [])

  return (
    <ScreenFrame className="bg-white">
      <div className="flex items-center justify-center py-4">
        <h1 className="text-base leading-none font-semibold text-foreground">Inventory</h1>
      </div>
      <section className="flex flex-col gap-2">
        <div className="flex rounded-full bg-secondary" role="tablist" aria-label="Inventory tabs">
          {[
            { key: 'products' as const, label: 'My Products' },
            { key: 'wishlist' as const, label: 'Wishlist' },
            { key: 'history' as const, label: 'History' },
          ].map((tab) => {
            const isActive = activeTab === tab.key

            return (
              <Button
                key={tab.key}
                type="button"
                variant="ghost"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.key)}
                className={isActive
                  ? 'min-h-[34px] flex-1 rounded-full bg-[#ee886e] px-2.5 py-2 text-[14px] leading-[16px] text-white hover:bg-[#e27f66]'
                  : 'min-h-[34px] flex-1 rounded-full px-2.5 py-2 text-[14px] leading-[16px] text-[#71717a] hover:bg-transparent'
                }
              >
                {tab.label}
              </Button>
            )
          })}
        </div>

        <SearchField
          className="border border-border"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={`Search ${activeTab === 'products' ? 'products' : activeTab === 'wishlist' ? 'wishlist' : 'history'}...`}
        />
      </section>

      <section
        ref={listRef}
        className="mt-[18px] flex flex-1 flex-col gap-2.5 overflow-y-auto pb-3"
        aria-label="Inventory product list"
      >
        {loading && !loaded[activeTab] ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#ee886e]" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-[14px] text-[#71717a]">{emptyStates[activeTab].title}</p>
            <p className="text-[12px] text-[#a1a1aa]">{emptyStates[activeTab].hint}</p>
          </div>
        ) : (
          cards.map((card, index) => (
            <HorizontalProductCard
              key={`${activeTab}-${index}`}
              item={card.product}
              imageSrc={card.imageUrl}
              onPress={card.productId ? () => navigate(`/product/${card.productId}`) : undefined}
            />
          ))
        )}
      </section>
    </ScreenFrame>
  )
}

export default InventoryScreen
