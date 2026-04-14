import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Camera, Link } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { products } from './data'
import { HorizontalProductCard } from './shared'
import { listProducts, type ProductListItem } from '../lib/scan-api'
import { useAuth } from '../contexts/auth-context'

function AdviserScanScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id
  const productImage = '/introduction-image.png'
  const [availableProducts, setAvailableProducts] = useState<ProductListItem[]>([])

  useEffect(() => {
    listProducts(userId).then(setAvailableProducts).catch((err) => { console.error(err); toast.error(err instanceof Error ? err.message : 'Failed to load products') })
  }, [userId])

  const analysisItems = [
    products[0],
    products[1],
    products[2],
    products[0],
    products[0],
    products[1],
  ]

  function handleScanProduct() {
    if (availableProducts.length > 0) {
      navigate('/adviser/result', {
        state: { productId: availableProducts[0].id },
      })
    } else {
      navigate('/scan')
    }
  }

  return (
    <div className="px-4 pt-4">
      <section className="flex flex-col gap-6">
        <h1 className="text-center text-base leading-none font-semibold">Adviser</h1>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            onClick={handleScanProduct}
            className="flex min-h-27 flex-col items-center justify-center gap-2 rounded-[20px] border-0 bg-[#ee886e] px-7.75 py-6 text-base leading-none font-medium text-white shadow-none hover:bg-[#e57f65]"
          >
            <Camera size={36} />
            Scan a product
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex min-h-27 flex-col items-center justify-center gap-2 rounded-[20px] border-0 bg-[#e9e9eb] px-7.75 py-6 text-base leading-none font-medium text-[#09090b] shadow-none hover:bg-[#e4e4e7]"
          >
            <Link size={36} />
            Copy Link
          </Button>
        </div>
      </section>

      <section className="mt-6 flex flex-1 flex-col gap-4 pb-25.5">
        <h2 className="text-base leading-none font-medium text-black">Recent Analysis</h2>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {analysisItems.map((item, index) => (
            <HorizontalProductCard
              key={`analysis-${index}`}
              item={item}
              imageSrc={productImage}
              showDecisionPanel
              className="h-19 rounded-2xl"
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default AdviserScanScreen
