import { ArrowLeft, SendHorizontal } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { Chip, IconButton, ScreenFrame, SearchField } from './shared'

function AdviserChatOpeningScreen() {
  return (
    <ScreenFrame variant="gradient">
      <section className="mt-2 flex items-center gap-2.5">
        <IconButton muted>
          <ArrowLeft size={18} />
        </IconButton>
        <p className="text-[16px] leading-[16px] font-semibold">Skinory Adviser</p>
      </section>

      <section className="mt-24 flex flex-col items-center gap-2.5 text-center">
        <div
          className="h-14 w-14 rounded-[48px_48px_48px_8px] bg-[radial-gradient(circle_at_30%_30%,#fff_0%,#f4f4f5_70%)]"
          style={{ transform: 'rotate(-35deg)' }}
          aria-hidden="true"
        />
        <h1 className="text-[36px] leading-none font-normal [font-family:Noorliza,'Iowan_Old_Style',serif]">Hi Sena,</h1>
        <h2 className="text-[24px] leading-none font-medium">How can I help you today?</h2>
        <p className="max-w-[312px] text-[14px] leading-[20px] text-[#3f3f46]">
          Let’s enhance your skincare routine for a glow with some great tips and products!
        </p>
      </section>

      <div className="mt-auto flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip>How to take care of oily skin</Chip>
        <Chip>Best products for oily skin</Chip>
        <Chip>Tips for preventing acn...</Chip>
      </div>

      <section className="mt-4 mb-24 grid grid-cols-[1fr_auto] gap-2">
        <SearchField />
        <Button type="button" size="icon" className="h-12 w-12 rounded-full bg-[#ee886e] text-white hover:bg-[#e27f66]">
          <SendHorizontal size={16} />
        </Button>
      </section>
    </ScreenFrame>
  )
}

export default AdviserChatOpeningScreen
