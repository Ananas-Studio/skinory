import { Camera, ScanLine } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { ScreenFrame } from './shared'

function ScanScreen() {
  return (
    <ScreenFrame variant="camera">
      <section className="relative flex-1">
        <div className="absolute top-[222px] left-1/2 h-[400px] w-[298px] -translate-x-1/2 rounded-[24px] border-4 border-dashed border-white" aria-hidden="true" />

        <Button
          type="button"
          className="absolute bottom-[100px] left-1/2 h-[66px] w-[66px] -translate-x-1/2 rounded-full border-4 border-white bg-white/20"
          aria-label="Shutter button"
        />

        <div className="absolute bottom-8 left-1/2 grid w-[298px] -translate-x-1/2 grid-cols-2 gap-1 rounded-full border border-white/50 bg-white/30 p-1" role="tablist" aria-label="Scan mode">
          <Button type="button" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-[#ee886e] text-[14px] leading-[24px] text-white hover:bg-[#e27f66]">
            <Camera size={16} />
            Photo
          </Button>
          <Button type="button" variant="ghost" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full text-[14px] leading-[24px] text-white hover:bg-white/10">
            <ScanLine size={16} />
            Barcode
          </Button>
        </div>
      </section>
    </ScreenFrame>
  )
}

export default ScanScreen
