import { ArrowLeft } from '@skinory/ui/icons'
import { products } from './data'
import { IconButton, ProductCard, ScreenFrame, SearchField } from './shared'

function SearchScreen() {
  return (
    <ScreenFrame>
      <section className="mt-[10px] flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <IconButton>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-[24px] leading-none font-medium">Search</h1>
        </div>
        <SearchField />
      </section>

      <section className="mt-[10px] flex max-h-[356px] flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
        {products.concat(products[0]).map((item, index) => (
          <ProductCard key={`search-${index}`} item={{ ...item, decision: undefined }} />
        ))}
      </section>

      <section className="mx-[-16px] mt-auto flex flex-col gap-1.5 border-t border-black/10 bg-[#f4f4f5] px-2 pt-2.5 pb-3" aria-label="Keyboard mock">
        <div className="flex justify-between px-2.5 text-[14px] text-[#8f8f8f]">
          <span>“The”</span>
          <span>the</span>
          <span>to</span>
        </div>

        {['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((row) => (
          <div key={row} className="flex justify-center gap-1.5">
            {row.split('').map((key) => (
              <span
                key={key}
                className="grid h-[42px] min-w-[30px] place-items-center rounded-[6px] bg-white text-[16px] shadow-[0_1px_0_rgba(0,0,0,0.35)]"
              >
                {key}
              </span>
            ))}
          </div>
        ))}

        <div className="flex justify-center gap-1.5">
          <span className="grid h-[42px] min-w-[64px] place-items-center rounded-[6px] bg-white text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.35)]">ABC</span>
          <span className="grid h-[42px] w-[172px] place-items-center rounded-[6px] bg-white text-[16px] shadow-[0_1px_0_rgba(0,0,0,0.35)]">space</span>
          <span className="grid h-[42px] min-w-[64px] place-items-center rounded-[6px] bg-white text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.35)]">return</span>
        </div>
      </section>
    </ScreenFrame>
  )
}

export default SearchScreen
