import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@skinory/ui/components/button'
import { Google } from '@skinory/ui/icons'

// ─── Google Identity Services – OAuth2 Token Client types ────────────────────

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  error?: string
  error_description?: string
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type: string; message?: string }) => void
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: TokenClientConfig) => TokenClient
  revoke: (token: string, callback?: () => void) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: unknown
        oauth2?: GoogleAccountsOauth2
      }
    }
  }
}

// ─── Google Userinfo response ────────────────────────────────────────────────

interface GoogleUserInfo {
  sub: string
  email?: string
  name?: string
  picture?: string
}

export interface GoogleCredentialPayload {
  providerUserId: string
  idToken: string // access_token used as bearer token
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

const GSI_SCRIPT_ID = 'google-gsi-script'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

function normalizeClientId(value?: string): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^['"]|['"]$/g, '')
}

const GoogleAuthButton = ({
  clientId,
  onCredential,
  onReadyChange,
  onError,
  disabled = false,
}: GoogleAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const tokenClientRef = useRef<TokenClient | null>(null)

  const resolvedClientId = useMemo(() => normalizeClientId(clientId), [clientId])

  // Stable refs for callbacks
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

    const initTokenClient = (): void => {
      if (isCancelled) return

      const oauth2 = window.google?.accounts?.oauth2
      if (!oauth2) return

      tokenClientRef.current = oauth2.initTokenClient({
        client_id: resolvedClientId,
        scope: 'openid email profile',
        callback: async (response) => {
          if (response.error || !response.access_token) {
            if (!isCancelled) onErrorRef.current?.(`Google hatası: ${response.error_description ?? response.error ?? 'bilinmiyor'}`)
            return
          }

          setIsLoading(true)
          try {
            // Fetch user profile from Google
            const res = await fetch(USERINFO_URL, {
              headers: { Authorization: `Bearer ${response.access_token}` },
            })
            if (!res.ok) throw new Error('Kullanıcı bilgisi alınamadı')

            const userInfo = (await res.json()) as GoogleUserInfo
            if (!userInfo.sub) throw new Error('Google sub ID bulunamadı')

            const payload: GoogleCredentialPayload = {
              providerUserId: userInfo.sub,
              idToken: response.access_token,
              email: userInfo.email,
              fullName: userInfo.name,
              avatarUrl: userInfo.picture,
            }

            await Promise.resolve(onCredentialRef.current(payload))
          } catch (err) {
            if (!isCancelled) {
              const msg = err instanceof Error ? err.message : 'Google girişi işlenirken hata oluştu.'
              onErrorRef.current?.(msg)
            }
          } finally {
            if (!isCancelled) setIsLoading(false)
          }
        },
        error_callback: (error) => {
          // Fires if the popup is closed or blocked
          if (!isCancelled && error.type !== 'popup_closed') {
            onErrorRef.current?.(`Google popup hatası: ${error.message ?? error.type}`)
          }
        },
      })

      if (!isCancelled) onReadyChangeRef.current?.(true)
    }

    onReadyChangeRef.current?.(false)

    if (window.google?.accounts?.oauth2) {
      initTokenClient()
    } else {
      // Load the GSI script if not already present
      const existing = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null
      const bindScript = (el: HTMLScriptElement) => {
        const onLoad = () => initTokenClient()
        const onErr = () => {
          if (!isCancelled) {
            onReadyChangeRef.current?.(false)
            onErrorRef.current?.('Google script yüklenemedi.')
          }
        }
        el.addEventListener('load', onLoad, { once: true })
        el.addEventListener('error', onErr, { once: true })
      }

      if (existing) {
        bindScript(existing)
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.id = GSI_SCRIPT_ID
        bindScript(script)
        document.head.appendChild(script)
      }
    }

    return () => {
      isCancelled = true
      tokenClientRef.current = null
      onReadyChangeRef.current?.(false)
    }
  }, [resolvedClientId])

  const handleClick = (): void => {
    if (!resolvedClientId) {
      onError?.('Google Client ID boş.')
      return
    }

    if (!tokenClientRef.current) {
      onError?.('Google auth hazır değil, lütfen tekrar deneyin.')
      return
    }

    // Opens the standard Google account picker popup
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
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
