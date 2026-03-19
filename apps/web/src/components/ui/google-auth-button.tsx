import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@skinory/ui/components/button'
import { Google } from '@skinory/ui/icons'

interface GoogleCodeResponse {
  code?: string
  error?: string
  error_description?: string
}

interface GoogleCodeClient {
  requestCode: () => void
}

interface GoogleAccountsOauth2 {
  initCodeClient: (config: {
    client_id: string
    scope: string
    ux_mode?: 'popup' | 'redirect'
    callback: (response: GoogleCodeResponse) => void
    error_callback?: (error: { type: string }) => void
  }) => GoogleCodeClient
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOauth2
      }
    }
  }
}

interface GoogleAuthButtonProps {
  clientId?: string
  onCode: (code: string) => void | Promise<void>
  onReadyChange?: (isReady: boolean) => void
  onError?: (message: string) => void
  disabled?: boolean
}

const scriptSelector = 'script[data-google-gsi="true"]'

function normalizeClientId(value?: string): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/^['"]|['"]$/g, '')
}

const GoogleAuthButton = ({ clientId, onCode, onReadyChange, onError, disabled = false }: GoogleAuthButtonProps) => {
  const codeClientRef = useRef<GoogleCodeClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const resolvedClientId = useMemo(() => normalizeClientId(clientId), [clientId])

  useEffect(() => {
    if (!resolvedClientId) {
      onReadyChange?.(false)
      return
    }

    let isCancelled = false
    let cleanupLoadHandler: (() => void) | null = null
    let cleanupErrorHandler: (() => void) | null = null

    const configureGoogle = (): void => {
      if (isCancelled) {
        return
      }

      const googleOauth2 = window.google?.accounts?.oauth2
      if (!googleOauth2) {
        return
      }

      try {
        codeClientRef.current = googleOauth2.initCodeClient({
          client_id: resolvedClientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response) => {
            if (response.code) {
              setIsLoading(true)
              void Promise.resolve(onCode(response.code))
                .catch(() => {
                  if (!isCancelled) {
                    onError?.('Google kodu islenirken bir hata olustu.')
                  }
                })
                .finally(() => {
                  if (!isCancelled) {
                    setIsLoading(false)
                  }
                })
              return
            }

            if (!isCancelled) {
              const message = response.error_description ?? response.error ?? 'Google authorization code alinamadi.'
              onError?.(message)
            }
          },
          error_callback: (error) => {
            if (!isCancelled) {
              onError?.(`Google popup hatasi: ${error.type}`)
            }
          },
        })
      } catch {
        if (!isCancelled) {
          onError?.('Google OAuth baslatilamadi. Client ID ve Authorized JavaScript origins ayarlarini kontrol edin.')
        }
        return
      }

      onReadyChange?.(true)
    }

    const handleScriptLoad = (): void => {
      configureGoogle()
    }

    const handleScriptError = (): void => {
      if (!isCancelled) {
        onReadyChange?.(false)
        onError?.('Google script yuklenemedi. Ag veya tarayici engelini kontrol edin.')
      }
    }

    onReadyChange?.(false)

    if (window.google?.accounts?.oauth2) {
      configureGoogle()
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(scriptSelector)
      if (existingScript) {
        existingScript.addEventListener('load', handleScriptLoad, { once: true })
        existingScript.addEventListener('error', handleScriptError, { once: true })
        cleanupLoadHandler = () => existingScript.removeEventListener('load', handleScriptLoad)
        cleanupErrorHandler = () => existingScript.removeEventListener('error', handleScriptError)
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.dataset.googleGsi = 'true'
        script.addEventListener('load', handleScriptLoad, { once: true })
        script.addEventListener('error', handleScriptError, { once: true })

        cleanupLoadHandler = () => script.removeEventListener('load', handleScriptLoad)
        cleanupErrorHandler = () => script.removeEventListener('error', handleScriptError)

        document.head.appendChild(script)
      }
    }

    return () => {
      isCancelled = true
      codeClientRef.current = null
      onReadyChange?.(false)

      if (cleanupLoadHandler) {
        cleanupLoadHandler()
      }
      if (cleanupErrorHandler) {
        cleanupErrorHandler()
      }
    }
  }, [onCode, onError, onReadyChange, resolvedClientId])

  const handleClick = (): void => {
    if (!resolvedClientId) {
      onError?.('Google Client ID bos.')
      return
    }

    if (!codeClientRef.current) {
      onError?.('Google auth hazir degil, lutfen tekrar deneyin.')
      return
    }

    codeClientRef.current.requestCode()
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
