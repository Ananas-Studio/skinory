import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenFrame } from './shared'
import AppleAuthButton from '../components/ui/apple-auth-button'
import GoogleAuthButton from '../components/ui/google-auth-button'
import type { GoogleCredentialPayload } from '../components/ui/google-auth-button'
import { SkinoryLogo } from '@skinory/ui/icons'
import AuthImage from '../assets/auth-image'
import { useAuth } from '../contexts/auth-context'

function SignInScreen() {
  const [authStatus, setAuthStatus] = useState<string | null>(null)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleAppleAuthorization = async (payload: {
    providerUserId: string
    idToken: string
    email?: string
    fullName?: string
  }): Promise<void> => {
    try {
      await signIn({
        provider: 'apple',
        providerUserId: payload.providerUserId,
        idToken: payload.idToken,
        email: payload.email,
        fullName: payload.fullName,
      })
      navigate('/home', { replace: true })
    } catch {
      setAuthStatus('Apple ile giris basarisiz oldu.')
    }
  }

  const handleGoogleCredential = async (payload: GoogleCredentialPayload): Promise<void> => {
    try {
      await signIn({
        provider: 'google',
        providerUserId: payload.providerUserId,
        idToken: payload.idToken,
        email: payload.email,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
      })
      navigate('/home', { replace: true })
    } catch {
      setAuthStatus('Google ile giris basarisiz oldu.')
    }
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
            onCredential={handleGoogleCredential}
            onError={(message) => {
              setAuthStatus(message)
            }}
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
