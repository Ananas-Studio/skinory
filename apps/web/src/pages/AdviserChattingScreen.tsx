import { ArrowLeft, SendHorizontal } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { DecisionTag, IconButton, ScreenFrame, SearchField } from './shared'

function AdviserChattingScreen() {
  return (
    <ScreenFrame variant="gradient">
      <section className="mt-2 flex items-center gap-2.5">
        <IconButton muted>
          <ArrowLeft size={18} />
        </IconButton>
        <p className="text-[16px] leading-[16px] font-semibold">Skinory Adviser</p>
      </section>

      <section className="mt-3 flex max-h-[572px] flex-1 flex-col gap-4 overflow-y-auto pb-2.5">
        <article className="flex justify-start">
          <div className="flex max-w-[318px] flex-col gap-2 rounded-[16px] border border-[#e4e4e7] bg-white p-2.5 text-[14px] leading-[20px] text-[#3f3f46]">
            <DecisionTag decision="Buy" />
            <p>Sorem ipsum dolor sit amet, consectet adipiscing elit?</p>
            <p>
              Sorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac
              aliquet odio mattis. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos
              himenaeos.
            </p>
            <ul className="list-disc pl-4">
              <li>Sorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
              <li>Nunc vulputate libero et velit interdum, ac aliquet odio mattis.</li>
              <li>Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.</li>
            </ul>
          </div>
        </article>

        <article className="flex justify-end">
          <div className="max-w-[205px] rounded-[16px] border border-[#e4e4e7] bg-white p-2.5 text-[14px] leading-[20px] text-[#3f3f46]">
            Sorem ipsum dolor sit amet?
          </div>
        </article>

        <article className="flex justify-start">
          <div className="max-w-[318px] rounded-[16px] border border-[#e4e4e7] bg-white p-2.5 text-[14px] leading-[20px] text-[#3f3f46]">
            Sorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac
            aliquet odio mattis.
          </div>
        </article>
      </section>

      <section className="mt-auto mb-24 grid grid-cols-[1fr_auto] gap-2">
        <SearchField />
        <Button type="button" size="icon" className="h-12 w-12 rounded-full bg-[#ee886e] text-white hover:bg-[#e27f66]">
          <SendHorizontal size={16} />
        </Button>
      </section>
    </ScreenFrame>
  )
}

export default AdviserChattingScreen
