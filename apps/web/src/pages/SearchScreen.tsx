import { useEffect, useMemo, useRef, useState } from 'react'
import { products } from './data'
import { HorizontalProductCard, IconButton, ScreenFrame, SearchField } from './shared'
import { ArrowLeft } from '@skinory/ui/icons'

type InventoryTabKey = 'products' | 'wishlist' | 'history'

function InventoryScreen() {
  const [activeTab, _setActiveTab] = useState<InventoryTabKey>('products')
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
      <div className="flex items-center justify-center py-4 relative">
        <IconButton className="absolute left-0 rounded-sm!" variant='outline'>
          <ArrowLeft />
        </IconButton>

        <h1 className="text-base leading-none font-semibold text-foreground">Search</h1>
      </div>
      <section className="flex flex-col gap-2">
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
