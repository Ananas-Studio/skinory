import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@skinory/ui/components/button'
import { products } from './data'
import { HorizontalProductCard, ScreenFrame, SearchField } from './shared'

type InventoryTabKey = 'products' | 'wishlist' | 'history'

function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<InventoryTabKey>('products')
  const [visibleCount, setVisibleCount] = useState(10)
  const listRef = useRef<HTMLElement | null>(null)

  const dataByTab = useMemo(
    () => ({
      products,
      wishlist: [...products].reverse(),
      history: [products[1], products[2], products[0]],
    }),
    []
  )

  const activeData = dataByTab[activeTab]

  const renderedItems = useMemo(
    () => Array.from({ length: visibleCount }, (_, index) => activeData[index % activeData.length]),
    [activeData, visibleCount]
  )

  useEffect(() => {
    setVisibleCount(10)
    listRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  const handleListScroll = () => {
    const listElement = listRef.current

    if (!listElement) {
      return
    }

    const threshold = 220
    const isNearBottom = listElement.scrollHeight - listElement.scrollTop - listElement.clientHeight < threshold

    if (isNearBottom) {
      setVisibleCount((prev) => prev + 8)
    }
  }

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
                onClick={() => setActiveTab(tab.key)}
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

        <SearchField className="border border-border" />
      </section>

      <section
        ref={listRef}
        onScroll={handleListScroll}
        className="mt-[18px] flex flex-1 flex-col gap-2.5 overflow-y-auto pb-3"
        aria-label="Inventory product list"
      >
        {renderedItems.map((item, index) => (
          <HorizontalProductCard
            key={`inventory-${activeTab}-${index}`}
            item={{ ...item, decision: undefined }}
            imageSrc="/auth-image.svg"
          />
        ))}
      </section>
    </ScreenFrame>
  )
}

export default InventoryScreen
