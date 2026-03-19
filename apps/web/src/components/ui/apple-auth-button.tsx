import { useEffect, useMemo, useState } from 'react'
import { Button } from '@skinory/ui/components/button'
import { AppleBrand } from '@skinory/ui/icons'

interface AppleSignInPayload {
  providerUserId: string
  idToken: string
  email?: string
  fullName?: string
  authorizationCode?: string
}

interface AppleAuthButtonProps {
  clientId?: string
  redirectUri?: string
  onAuthorization: (payload: AppleSignInPayload) => void | Promise<void>
  onReadyChange?: (isReady: boolean) => void
  onError?: (message: string) => void
  disabled?: boolean
}

interface AppleJwtPayload {
  sub?: string
  email?: string
}

interface AppleSignInResponse {
  authorization?: {
    code?: string
    id_token?: string
  }
  user?: {
    name?: {
      firstName?: string
      lastName?: string
    }
    email?: string
  }
}

interface AppleAuthApi {
  init: (config: {
    clientId: string
    scope?: string
    redirectURI: string
    usePopup?: boolean
  }) => void
  signIn: () => Promise<AppleSignInResponse>
}

declare global {
  interface Window {
    AppleID?: {
      auth?: AppleAuthApi
    }
  }
}

const scriptSelector = 'script[data-apple-auth="true"]'

function normalizeEnvValue(value?: string): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/^['"]|['"]$/g, '')
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
  return atob(padded)
}

function parseAppleJwtPayload(idToken: string): AppleJwtPayload | null {
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    return null
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as AppleJwtPayload
  } catch {
    return null
  }
}

const AppleAuthButton = ({
  clientId,
  redirectUri,
  onAuthorization,
  onReadyChange,
  onError,
  disabled = false,
}: AppleAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const resolvedClientId = useMemo(() => normalizeEnvValue(clientId), [clientId])
  const resolvedRedirectUri = useMemo(() => normalizeEnvValue(redirectUri), [redirectUri])

  useEffect(() => {
    if (!resolvedClientId || !resolvedRedirectUri) {
      setIsReady(false)
      onReadyChange?.(false)
      return
    }

    let isCancelled = false
    let cleanupLoadHandler: (() => void) | null = null
    let cleanupErrorHandler: (() => void) | null = null

    const initializeAppleAuth = (): void => {
      if (isCancelled) {
        return
      }

      const appleAuth = window.AppleID?.auth
      if (!appleAuth) {
        return
      }

      try {
        appleAuth.init({
          clientId: resolvedClientId,
          scope: 'name email',
          redirectURI: resolvedRedirectUri,
          usePopup: true,
        })
      } catch {
        if (!isCancelled) {
          onError?.('Apple OAuth baslatilamadi. Service ID ve redirect URI ayarlarini kontrol edin.')
        }
        return
      }

      setIsReady(true)
      onReadyChange?.(true)
    }

    const handleScriptLoad = (): void => {
      initializeAppleAuth()
    }

    const handleScriptError = (): void => {
      if (!isCancelled) {
        setIsReady(false)
        onReadyChange?.(false)
        onError?.('Apple script yuklenemedi. Ag veya tarayici engelini kontrol edin.')
      }
    }

    onReadyChange?.(false)

    if (window.AppleID?.auth) {
      initializeAppleAuth()
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(scriptSelector)
      if (existingScript) {
        existingScript.addEventListener('load', handleScriptLoad, { once: true })
        existingScript.addEventListener('error', handleScriptError, { once: true })
        cleanupLoadHandler = () => existingScript.removeEventListener('load', handleScriptLoad)
        cleanupErrorHandler = () => existingScript.removeEventListener('error', handleScriptError)
      } else {
        const script = document.createElement('script')
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
        script.async = true
        script.defer = true
        script.dataset.appleAuth = 'true'
        script.addEventListener('load', handleScriptLoad, { once: true })
        script.addEventListener('error', handleScriptError, { once: true })

        cleanupLoadHandler = () => script.removeEventListener('load', handleScriptLoad)
        cleanupErrorHandler = () => script.removeEventListener('error', handleScriptError)

        document.head.appendChild(script)
      }
    }

    return () => {
      isCancelled = true
      setIsReady(false)
      onReadyChange?.(false)

      if (cleanupLoadHandler) {
        cleanupLoadHandler()
      }
      if (cleanupErrorHandler) {
        cleanupErrorHandler()
      }
    }
  }, [onError, onReadyChange, resolvedClientId, resolvedRedirectUri])

  const handleClick = async (): Promise<void> => {
    if (!resolvedClientId || !resolvedRedirectUri) {
      onError?.('Apple Client ID veya Redirect URI bos.')
      return
    }

    if (!isReady) {
      onError?.('Apple auth hazir degil, lutfen tekrar deneyin.')
      return
    }

    const appleAuth = window.AppleID?.auth
    if (!appleAuth) {
      onError?.('Apple auth API bulunamadi.')
      return
    }

    setIsLoading(true)

    try {
      const response = await appleAuth.signIn()
      const idToken = response.authorization?.id_token
      if (!idToken) {
        onError?.('Apple id_token alinamadi.')
        return
      }

      const jwtPayload = parseAppleJwtPayload(idToken)
      const providerUserId = jwtPayload?.sub
      if (!providerUserId) {
        onError?.('Apple provider user id alinamadi.')
        return
      }

      const fullName = [response.user?.name?.firstName, response.user?.name?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || undefined

      await onAuthorization({
        providerUserId,
        idToken,
        email: response.user?.email ?? jwtPayload?.email,
        fullName,
        authorizationCode: response.authorization?.code,
      })
    } catch {
      onError?.('Apple ile giris iptal edildi veya basarisiz oldu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className="flex min-h-12 w-79.5 items-center justify-center gap-2 rounded-full bg-[#09090b] px-3 py-2 text-[14px] leading-6 font-medium text-[#fafafa]"
      onClick={() => {
        void handleClick()
      }}
      disabled={disabled || !isReady || isLoading}
      aria-label="Sign in with Apple"
    >
      <AppleBrand className="h-4.5 w-4.5 fill-white!" />
      {isLoading ? 'Signing in...' : 'Sign in with Apple'}
    </Button>
  )
}

export default AppleAuthButton