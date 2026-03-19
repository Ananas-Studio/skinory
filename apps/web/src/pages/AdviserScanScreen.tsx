import { Camera, Link as LinkIcon } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { products } from './data'
import { ProductCard, ScreenFrame } from './shared'

function AdviserScanScreen() {
  return (
    <ScreenFrame>
      <section className="flex flex-col gap-3.5">
        <h1 className="text-[24px] leading-none font-medium">Adviser</h1>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-[16px] border border-[#e4e4e7] bg-white text-[14px] leading-[16px] text-[#18181b] shadow-[0_0_12px_rgba(0,0,0,0.1)]"
          >
            <Camera size={30} />
            Scan a product
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-[16px] border-[#e4e4e7] bg-white text-[14px] leading-[16px] text-[#18181b] shadow-none hover:bg-white"
          >
            <LinkIcon size={30} />
            Link a product
          </Button>
        </div>
      </section>

      <section className="mt-[18px] flex flex-1 flex-col gap-3 pb-[102px]">
        <h2 className="text-[16px] leading-none font-semibold">Recent Analysis</h2>
        <div className="flex max-h-[500px] flex-col gap-2.5 overflow-y-auto">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProductCard key={`analysis-${index}`} item={products[index % 3]} />
          ))}
        </div>
      </section>
    </ScreenFrame>
  )
}

export default AdviserScanScreen
