import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@skinory/ui/components/button'
import { Google } from '@skinory/ui/icons'

// ─── Google Identity Services (credential / One Tap) types ──────────────────

interface GoogleCredentialResponse {
  credential?: string
  select_by?: string
  clientId?: string
}

interface GoogleIdConfig {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  itp_support?: boolean
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void
  prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId
        oauth2?: unknown
      }
    }
  }
}

export interface GoogleCredentialPayload {
  providerUserId: string
  idToken: string
  email?: string
  fullName?: string
  avatarUrl?: string
}

interface GoogleAuthButtonProps {
  clientId?: string
  onCredential: (payload: GoogleCredentialPayload) => void | Promise<void>
  onReadyChange?: (isReady: boolean) => void
  onError?: (message: string) => void
  disabled?: boolean
}

const scriptSelector = 'script[data-google-gsi="true"]'

function normalizeClientId(value?: string): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

const GoogleAuthButton = ({
  clientId,
  onCredential,
  onReadyChange,
  onError,
  disabled = false,
}: GoogleAuthButtonProps) => {
  const readyRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)

  const resolvedClientId = useMemo(() => normalizeClientId(clientId), [clientId])

  // Keep stable refs to callbacks to avoid re-initializing GIS on every render
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential
  const onReadyChangeRef = useRef(onReadyChange)
  onReadyChangeRef.current = onReadyChange
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    if (!resolvedClientId) {
      onReadyChangeRef.current?.(false)
      return
    }

    let isCancelled = false
    let cleanupLoad: (() => void) | null = null
    let cleanupError: (() => void) | null = null

    const configureGoogle = (): void => {
      if (isCancelled) return

      const gid = window.google?.accounts?.id
      if (!gid) return

      try {
        gid.initialize({
          client_id: resolvedClientId,
          callback: (response) => {
            if (!response.credential) {
              if (!isCancelled) onErrorRef.current?.('Google credential alinamadi.')
              return
            }

            const claims = decodeJwtPayload(response.credential)
            if (!claims || !claims.sub) {
              if (!isCancelled) onErrorRef.current?.('Google token okunamadi.')
              return
            }

            const payload: GoogleCredentialPayload = {
              providerUserId: String(claims.sub),
              idToken: response.credential,
              email: typeof claims.email === 'string' ? claims.email : undefined,
              fullName: typeof claims.name === 'string' ? claims.name : undefined,
              avatarUrl: typeof claims.picture === 'string' ? claims.picture : undefined,
            }

            setIsLoading(true)
            void Promise.resolve(onCredentialRef.current(payload))
              .catch(() => {
                if (!isCancelled) onErrorRef.current?.('Google giris islenirken hata olustu.')
              })
              .finally(() => {
                if (!isCancelled) setIsLoading(false)
              })
          },
          cancel_on_tap_outside: true,
        })

        readyRef.current = true
        onReadyChangeRef.current?.(true)
      } catch {
        if (!isCancelled) {
          onErrorRef.current?.('Google OAuth baslatilamadi. Client ID ayarlarini kontrol edin.')
        }
      }
    }

    onReadyChangeRef.current?.(false)

    if (window.google?.accounts?.id) {
      configureGoogle()
    } else {
      const existing = document.querySelector<HTMLScriptElement>(scriptSelector)
      const bindScript = (el: HTMLScriptElement) => {
        const onLoad = () => configureGoogle()
        const onErr = () => {
          if (!isCancelled) {
            onReadyChangeRef.current?.(false)
            onErrorRef.current?.('Google script yuklenemedi.')
          }
        }
        el.addEventListener('load', onLoad, { once: true })
        el.addEventListener('error', onErr, { once: true })
        cleanupLoad = () => el.removeEventListener('load', onLoad)
        cleanupError = () => el.removeEventListener('error', onErr)
      }

      if (existing) {
        bindScript(existing)
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.dataset.googleGsi = 'true'
        bindScript(script)
        document.head.appendChild(script)
      }
    }

    return () => {
      isCancelled = true
      readyRef.current = false
      onReadyChangeRef.current?.(false)
      cleanupLoad?.()
      cleanupError?.()
    }
  }, [resolvedClientId])

  const handleClick = (): void => {
    if (!resolvedClientId) {
      onError?.('Google Client ID bos.')
      return
    }

    const gid = window.google?.accounts?.id
    if (!gid || !readyRef.current) {
      onError?.('Google auth hazir degil, lutfen tekrar deneyin.')
      return
    }

    // Trigger the One Tap / popup flow
    gid.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: open the accounts chooser popup manually
        // This happens when One Tap is blocked (e.g. in iframe or cooldown)
        onError?.('Google popup gosterilemedi. Tarayici engelini kontrol edin.')
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="flex min-h-12 w-79.5 items-center justify-center gap-2 rounded-full border-[#e4e4e7] bg-white px-3 py-2 text-[14px] leading-6 font-medium text-[#09090b] shadow-none hover:bg-white"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label="Sign in with Google"
    >
      <Google className="h-4.5 w-4.5" />
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  )
}

export default GoogleAuthButton
