import { Link } from 'react-router-dom'
import { PrimaryButton, ScreenFrame } from './shared'

function IntroductionScreen() {
  return (
    <ScreenFrame variant="gradient" className="pb-10">
      <section className="mt-13.75" aria-hidden="true">
        <img
          src="/introduction-image.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </section>
      <section className="mt-[26px] flex flex-col gap-6 flex-1">
        <h1 className="min-h-[124px] text-[40px] leading-none font-normal [font-family:Noorliza,'Iowan_Old_Style',serif]">
          <span 
            className="underline decoration-[3px] underline-offset-auto decoration-wavy"
            style={{
              textDecorationSkipInk: "none",
              textUnderlinePosition: "from-font"
            }}
            >Scan</span> before
          <br />
          you buy,
          <br />
          Get personalized <span className='bg-[#FBA189]/80 rounded-full px-1'>advice</span>
        </h1>
        <Link to="/home" className='w-full mt-auto'>
          <PrimaryButton className='w-full'>Next</PrimaryButton>
        </Link>
      </section>
    </ScreenFrame>
  )
}

export default IntroductionScreen
