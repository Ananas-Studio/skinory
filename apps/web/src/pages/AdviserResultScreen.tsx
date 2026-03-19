import {
  ArrowLeft,
  Check,
  Heart,
  MessagesSquare,
  Moon,
  SunMedium,
} from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { DecisionTag, IconButton, PrimaryButton, ProductCard, ScreenFrame, SecondaryButton } from './shared'

function AdviserResultScreen() {
  return (
    <ScreenFrame>
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <IconButton>
            <ArrowLeft size={18} />
          </IconButton>
          <IconButton>
            <Heart size={18} />
          </IconButton>
        </div>

        <article className="flex gap-2.5 rounded-[16px] border border-[#e4e4e7] bg-white p-2.5">
          <div className="h-14 w-14 shrink-0 rounded-[10px] bg-[linear-gradient(145deg,#f9ded7,#f4cbc0)]" aria-hidden="true" />
          <div>
            <p className="text-[14px] leading-[16px] font-medium">CeraVe</p>
            <p className="mt-0.5 text-[12px] leading-[16px] text-[#71717a]">Hydrating Facial Cleanser</p>
            <div className="mt-1.5 flex gap-1.5">
              <span className="rounded-full border border-[#e4e4e7] bg-white px-2 py-0.5 text-[11px] leading-[14px] text-[#27272a]">Dry Skin</span>
              <span className="rounded-full border border-[#e4e4e7] bg-white px-2 py-0.5 text-[11px] leading-[14px] text-[#27272a]">Fragrance-free</span>
            </div>
          </div>
        </article>

        <article className="flex items-center justify-between rounded-[16px] border border-[#e4e4e7] bg-white p-3.5">
          <DecisionTag decision="Buy" />
          <p className="text-[14px] text-[#009437]">Great choice for your routine!</p>
        </article>
      </section>

      <section className="mt-[10px] flex max-h-[420px] flex-1 flex-col gap-2.5 overflow-y-auto pb-[192px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] leading-none font-semibold">Reasons</h2>
          <Button type="button" variant="link" className="h-auto p-0 text-[14px] leading-[20px] text-[#71717a] no-underline hover:no-underline">
            See All
          </Button>
        </div>

        {[
          'Perfect for your skin type: hydrating, non-irritating and fragnance-free.',
          'Strenghts skin barrier with ceramides.',
          'No conflicts with your routine',
          'Safe to use morning & night',
        ].map((reason) => (
          <p
            key={reason}
            className="flex items-start gap-2 rounded-[8px] border border-[#e4e4e7] bg-white p-2.5 text-[14px] leading-[20px]"
          >
            <Check size={14} className="mt-[2px]" />
            {reason}
          </p>
        ))}

        <h2 className="text-[16px] leading-none font-semibold">You Already Own</h2>

        <ProductCard
          item={{
            name: 'La Roche-Posay',
            subtitle: 'Toleriane Cleanser',
            tags: ['Sensitive', 'Redness'],
          }}
        />
      </section>

      <section className="absolute right-0 bottom-0 left-0 flex flex-col gap-2.5 border-t border-[#e4e4e7] bg-white px-4 pt-3 pb-4 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex gap-[3px] rounded-full border border-[#e4e4e7] bg-white p-[3px]" role="tablist" aria-label="Routine impact">
          <Button type="button" variant="ghost" className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-[14px] leading-[16px] text-[#71717a] hover:bg-transparent">
            <SunMedium size={14} />
            Routine Impact
          </Button>
          <Button type="button" className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#ee886e] px-2.5 py-2 text-[14px] leading-[16px] text-white hover:bg-[#e27f66]">
            <Moon size={14} />
          </Button>
        </div>

        <PrimaryButton>Add to Inventory</PrimaryButton>

        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton>Scan Again</SecondaryButton>
          <SecondaryButton>
            <MessagesSquare size={16} />
            Ask Adviser
          </SecondaryButton>
        </div>
      </section>
    </ScreenFrame>
  )
}

export default AdviserResultScreen
