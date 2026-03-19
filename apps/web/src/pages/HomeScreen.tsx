import { AlarmClock, Bell, ScanLine, UserRound } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { products } from './data'
import {
  Chip,
  IconButton,
  SearchField,
  VerticalProductCard,
} from './shared'

function HomeScreen() {
  return (
    <div className={`font-[Geist,'Avenir_Next','Segoe_UI',sans-serif]`}>
      <div className='bg-[#FEE7E1]'>
        <div className='p-4 pb-3 flex flex-row gap-6'>
          <div className='flex flex-col gap-2'>
            <p className='text-foreground text-2xl font-medium' style={{ letterSpacing: -0.6 }}>Welcome Back <span className='text-[#EE886E]'>Sena!</span></p>
            <p className='text-muted-foreground text-sm leading-[100%]'>You own 6 products · Routine updated yesterday</p>
          </div>
          <div className='flex flex-row gap-2.5'>
            <IconButton>
              <Bell size={18} />
            </IconButton>
            <IconButton>
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
            >
              <ScanLine size={16} className='text-white' />
              <span className='text-white text-sm leading-5'>Scan a barcode</span>
            </Button>

            <Button 
              type='button'
              variant={"default"}
              className='bg-white hover:bg-[#f3f4f6] flex-1'
            >
              <AlarmClock size={16} className='text-black' />
              <span className='text-black text-sm leading-5'>View Routine</span>
            </Button>
          </div>

          <SearchField />
        </div>
      </div>

      <section className='pt-5 px-4 flex flex-col flex-1 gap-3'>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] leading-none font-semibold">Last Scans</h2>
          <Button type="button" variant="link" className="h-auto p-0 text-[14px] leading-[20px] text-[#71717a] no-underline hover:no-underline">
            See all
          </Button>
        </div>

        <div
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Last scans carousel"
        >
          {products.map((item, index) => (
            <VerticalProductCard
              key={`${item.name}-${index}`}
              item={{ ...item, decision: undefined }}
              className="snap-start"
            />
          ))}
        </div>
      </section>

      <section className='pt-5 px-4 flex flex-col flex-1 gap-3 pb-10'>
        <h2 className="text-[16px] leading-none font-semibold">Popular Products</h2>

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active>All</Chip>
          <Chip>Sensitive</Chip>
          <Chip>Redness</Chip>
          <Chip>Moisturizing</Chip>
          <Chip>Anti Aging</Chip>
        </div>

        <div
          className='grid grid-cols-2 gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          {products.map((item, index) => (
            <VerticalProductCard
              key={`${item.name}-${index}`}
              item={item}
              className='w-auto min-w-[152px]'
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomeScreen
