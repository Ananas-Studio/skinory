import { ScreenFrame } from './shared'
import { SkinoryLogo } from '@skinory/ui/icons'

function SplashScreen() {
  return (
    <ScreenFrame variant="splash">
      <section className="relative m-auto h-48 w-48" aria-label="Skinory splash">
        <svg
          viewBox="0 0 200 200"
          className="size-full fill-white text-[14px] uppercase tracking-[0.5px] animate-[spin_14s_linear_infinite]"
          aria-hidden="true"
        >
          <defs>
            <path id="ring-path" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
          </defs>
          <text>
            <textPath href="#ring-path">Skinory · Skinory · Skinory · Skinory · Skinory · Skinory · </textPath>
          </text>
        </svg>
        <SkinoryLogo 
          className="absolute top-1/2 left-1/2 h-13 w-13 -translate-x-1/2 -translate-y-1/2 text-white"
        />
      </section>
    </ScreenFrame>
  )
}

export default SplashScreen
