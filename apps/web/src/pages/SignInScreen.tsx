import { useState } from 'react'
import { ScreenFrame } from './shared'
import AppleAuthButton from '../components/ui/apple-auth-button'
import GoogleAuthButton from '../components/ui/google-auth-button'
import { SkinoryLogo } from '@skinory/ui/icons'
import AuthImage from '../assets/auth-image'

function SignInScreen() {
  const [authStatus, setAuthStatus] = useState<string | null>(null)

  const handleAppleAuthorization = async (payload: {
    providerUserId: string
    idToken: string
    email?: string
    fullName?: string
  }): Promise<void> => {
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''
    const endpoint = `${apiBaseUrl}/auth/provider/sign-in`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'apple',
        providerUserId: payload.providerUserId,
        idToken: payload.idToken,
        email: payload.email,
        fullName: payload.fullName,
      }),
    })

    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: { message?: string } }
      | null

    if (!response.ok || !body?.ok) {
      const message = body?.error?.message ?? 'Apple sign in basarisiz oldu.'
      setAuthStatus(message)
      throw new Error(message)
    }

    setAuthStatus('Apple ile giris basarili.')
  }

  return (
    <ScreenFrame>
      <section className="flex flex-col items-center gap-8 text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <div className='flex flex-col gap-3 items-center'>
          <h1 className="text-[28px] leading-none font-normal [font-family:Noorliza,'Iowan_Old_Style',serif]">
            Sign in to your account
          </h1>
          <p className="max-w-[292px] text-[14px] leading-[20px] text-[#3f3f46]">
            Save your routine, track what you use, and get better buy or skip advice
          </p>
        </div>
        <SkinoryLogo className="h-6.75 w-6.75 text-[#09090b]" />
        <div className='w-79.5 flex flex-col gap-3'>
          <AppleAuthButton
            clientId={import.meta.env.VITE_APPLE_CLIENT_ID}
            redirectUri={import.meta.env.VITE_APPLE_REDIRECT_URI}
            onAuthorization={handleAppleAuthorization}
            onError={(message) => {
              setAuthStatus(message)
            }}
          />
          <GoogleAuthButton
            clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
            onCode={() => {}}
          />
          {authStatus ? (
            <p className="text-center text-[13px] leading-5 text-[#3f3f46]">{authStatus}</p>
          ) : null}
        </div>
      </section>
      <AuthImage className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 object-contain" />
    </ScreenFrame>
  )
}

export default SignInScreen
