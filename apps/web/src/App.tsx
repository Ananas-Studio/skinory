import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthProvider = 'google' | 'apple'

interface ServiceUser {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  authProvider: AuthProvider | null
  isGuest: boolean
  createdAt: string
  updatedAt: string
}

interface AuthIdentity {
  id: string
  provider: AuthProvider
  providerUserId: string
  email: string | null
  createdAt: string
  updatedAt: string
}

interface MeResult {
  user: ServiceUser
  connections: AuthIdentity[]
}

interface SignInRequest {
  provider: AuthProvider
  providerUserId: string
  idToken: string
  email?: string
  fullName?: string
  avatarUrl?: string
  accessToken?: string
  refreshToken?: string
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'pill' | 'rectangular' | 'circle' | 'square'
      width?: number
      logo_alignment?: 'left' | 'center'
    }
  ) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId
      }
    }
  }
}

interface ApiSuccess<T> {
  ok: true
  data: T
}

interface ApiFailure {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure

function randomToken(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function randomUserId(provider: AuthProvider): string {
  return `${provider}-test-${Math.random().toString(36).slice(2, 10)}`
}

function toOptional(value: string): string | undefined {
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const base64Url = token.split('.')[1]
  if (!base64Url) {
    return null
  }

  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')

  try {
    const decoded = atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function App() {
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''
  const googleButtonContainerRef = useRef<HTMLDivElement | null>(null)
  const [provider, setProvider] = useState<AuthProvider>('google')
  const [providerUserId, setProviderUserId] = useState(randomUserId('google'))
  const [idToken, setIdToken] = useState(randomToken('id-token'))
  const [email, setEmail] = useState('test.user+google@skinory.dev')
  const [fullName, setFullName] = useState('Skinory Test User')
  const [accessToken, setAccessToken] = useState(randomToken('access-token'))
  const [refreshToken, setRefreshToken] = useState(randomToken('refresh-token'))
  const [activeUserId, setActiveUserId] = useState('')
  const [result, setResult] = useState<MeResult | null>(null)
  const [connections, setConnections] = useState<AuthIdentity[]>([])
  const [statusText, setStatusText] = useState('Hazir')
  const [errorText, setErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)

  const baseHeaders = useMemo(() => ({ 'Content-Type': 'application/json' }), [])

  async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const payload = (await response.json()) as ApiResponse<T>
    return payload
  }

  function normalizeError(response: ApiFailure): string {
    return `${response.error.code}: ${response.error.message}`
  }

  function applyProviderDefaults(nextProvider: AuthProvider): void {
    setProvider(nextProvider)
    setProviderUserId(randomUserId(nextProvider))
    setIdToken(randomToken('id-token'))
    setAccessToken(randomToken('access-token'))
    setRefreshToken(randomToken('refresh-token'))
    setEmail(`test.user+${nextProvider}@skinory.dev`)
    setFullName(nextProvider === 'google' ? 'Google Test User' : 'Apple Test User')
  }

  const runSignIn = useCallback(async (request: SignInRequest): Promise<void> => {
    setIsLoading(true)
    setErrorText('')
    setStatusText(`${request.provider} sign-in istegi gonderiliyor...`)

    try {
      const response = await fetch('/auth/provider/sign-in', {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(request),
      })

      const payload = await parseResponse<MeResult>(response)
      if (!response.ok || !payload.ok) {
        setErrorText(normalizeError(payload as ApiFailure))
        setStatusText('Sign-in basarisiz')
        return
      }

      setResult(payload.data)
      setConnections(payload.data.connections)
      setActiveUserId(payload.data.user.id)
      setStatusText(`${request.provider} sign-in basarili`)
    } catch {
      setErrorText('API ulasilamiyor. API sunucusunun 4000 portunda acik oldugunu kontrol edin.')
      setStatusText('Baglanti hatasi')
    } finally {
      setIsLoading(false)
    }
  }, [baseHeaders])

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse): Promise<void> => {
      if (!response.credential) {
        setErrorText('Google credential alinamadi.')
        return
      }

      const payload = decodeJwtPayload(response.credential)
      const providerUserId = typeof payload?.sub === 'string' ? payload.sub : randomUserId('google')
      const resolvedEmail = typeof payload?.email === 'string' ? payload.email : undefined
      const resolvedName = typeof payload?.name === 'string' ? payload.name : 'Google User'
      const resolvedPicture = typeof payload?.picture === 'string' ? payload.picture : undefined

      setProvider('google')
      setProviderUserId(providerUserId)
      setIdToken(response.credential)
      setEmail(resolvedEmail ?? '')
      setFullName(resolvedName)

      await runSignIn({
        provider: 'google',
        providerUserId,
        idToken: response.credential,
        email: resolvedEmail,
        fullName: resolvedName,
        avatarUrl: resolvedPicture,
      })
    },
    [runSignIn]
  )

  useEffect(() => {
    if (!googleClientId) {
      setGoogleReady(false)
      return
    }

    let isCancelled = false
    let intervalId: number | null = null
    let attempts = 0
    const maxAttempts = 50

    function tryInitializeGoogleButton(): boolean {
      if (isCancelled) {
        return false
      }

      const googleId = window.google?.accounts?.id
      const container = googleButtonContainerRef.current
      if (!googleId || !container) {
        return false
      }

      container.innerHTML = ''
      googleId.initialize({
        client_id: googleClientId,
        callback: (credentialResponse) => {
          void handleGoogleCredential(credentialResponse)
        },
        ux_mode: 'popup',
      })
      googleId.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      })
      setGoogleReady(true)
      return true
    }

    function startInitializationWatch(): void {
      setGoogleReady(false)

      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }

      intervalId = window.setInterval(() => {
        attempts += 1
        const initialized = tryInitializeGoogleButton()
        if (initialized && intervalId !== null) {
          window.clearInterval(intervalId)
          intervalId = null
          return
        }

        if (attempts >= maxAttempts && intervalId !== null) {
          window.clearInterval(intervalId)
          intervalId = null
          if (!isCancelled) {
            setErrorText('Google auth baslatilamadi. VITE_GOOGLE_CLIENT_ID ve Authorized JavaScript origins ayarlarini kontrol edin.')
          }
        }
      }, 100)
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]')
    if (existingScript) {
      startInitializationWatch()
      return () => {
        isCancelled = true
        if (intervalId !== null) {
          window.clearInterval(intervalId)
        }
      }
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleGsi = 'true'
    script.onload = () => startInitializationWatch()
    script.onerror = () => {
      if (!isCancelled) {
        setErrorText('Google script yuklenemedi. Ag veya tarayici engelini kontrol edin.')
      }
    }
    document.head.appendChild(script)

    return () => {
      isCancelled = true
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [googleClientId, handleGoogleCredential])

  async function submitSignIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await runSignIn({
      provider,
      providerUserId: providerUserId.trim(),
      idToken: idToken.trim(),
      email: toOptional(email),
      fullName: toOptional(fullName),
      accessToken: toOptional(accessToken),
      refreshToken: toOptional(refreshToken),
    })
  }

  async function quickProviderSignIn(nextProvider: AuthProvider): Promise<void> {
    const request: SignInRequest = {
      provider: nextProvider,
      providerUserId: randomUserId(nextProvider),
      idToken: randomToken('id-token'),
      email: `test.user+${nextProvider}@skinory.dev`,
      fullName: nextProvider === 'google' ? 'Google Test User' : 'Apple Test User',
      accessToken: randomToken('access-token'),
      refreshToken: randomToken('refresh-token'),
    }

    setProvider(request.provider)
    setProviderUserId(request.providerUserId)
    setIdToken(request.idToken)
    setEmail(request.email ?? '')
    setFullName(request.fullName ?? '')
    setAccessToken(request.accessToken ?? '')
    setRefreshToken(request.refreshToken ?? '')

    await runSignIn(request)
  }

  async function fetchMe(): Promise<void> {
    if (!activeUserId) {
      setErrorText('Once sign-in yaparak bir user id olusturun.')
      return
    }

    setIsLoading(true)
    setErrorText('')
    setStatusText('/auth/me cagriliyor...')

    try {
      const response = await fetch('/auth/me', {
        headers: { 'x-user-id': activeUserId },
      })

      const payload = await parseResponse<MeResult>(response)
      if (!response.ok || !payload.ok) {
        setErrorText(normalizeError(payload as ApiFailure))
        setStatusText('/auth/me basarisiz')
        return
      }

      setResult(payload.data)
      setConnections(payload.data.connections)
      setStatusText('/auth/me basarili')
    } catch {
      setErrorText('API ulasilamiyor. API sunucusunun ayakta oldugunu kontrol edin.')
      setStatusText('Baglanti hatasi')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchConnections(): Promise<void> {
    if (!activeUserId) {
      setErrorText('Connections icin once user id gerekli.')
      return
    }

    setIsLoading(true)
    setErrorText('')
    setStatusText('/auth/connections cagriliyor...')

    try {
      const response = await fetch('/auth/connections', {
        headers: { 'x-user-id': activeUserId },
      })

      const payload = await parseResponse<{ connections: AuthIdentity[] }>(response)
      if (!response.ok || !payload.ok) {
        setErrorText(normalizeError(payload as ApiFailure))
        setStatusText('/auth/connections basarisiz')
        return
      }

      setConnections(payload.data.connections)
      setStatusText('/auth/connections basarili')
    } catch {
      setErrorText('API ulasilamiyor. API sunucusunun ayakta oldugunu kontrol edin.')
      setStatusText('Baglanti hatasi')
    } finally {
      setIsLoading(false)
    }
  }

  async function runSignOut(): Promise<void> {
    if (!activeUserId) {
      setErrorText('Sign-out icin once user id gerekli.')
      return
    }

    setIsLoading(true)
    setErrorText('')
    setStatusText('/auth/sign-out cagriliyor...')

    try {
      const response = await fetch('/auth/sign-out', {
        method: 'POST',
        headers: { 'x-user-id': activeUserId },
      })

      const payload = await parseResponse<{ signedOut: true }>(response)
      if (!response.ok || !payload.ok) {
        setErrorText(normalizeError(payload as ApiFailure))
        setStatusText('/auth/sign-out basarisiz')
        return
      }

      setStatusText('Sign-out basarili, tokenlar temizlendi')
    } catch {
      setErrorText('API ulasilamiyor. API sunucusunun ayakta oldugunu kontrol edin.')
      setStatusText('Baglanti hatasi')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="oauth-page">
      <section className="hero">
        <p className="eyebrow">Skinory Auth Sandbox</p>
        <h1>Google ve Apple OAuth Test Paneli</h1>
        <p className="hero-copy">
          Bu ekran gercek OAuth SDK baglamadan once backend auth akisini test etmek icin mock token ile calisir.
          Backend endpointi: <code>/auth/provider/sign-in</code>
        </p>
      </section>

      <section className="card">
        <div className="provider-actions">
          <div className="google-live-auth">
            <label className="provider-label">Google (Gercek Auth)</label>
            {googleClientId ? (
              <div ref={googleButtonContainerRef} className="google-button-host" />
            ) : (
              <p className="provider-hint">Google auth icin `.env` dosyasina `VITE_GOOGLE_CLIENT_ID` ekleyin.</p>
            )}
            {googleClientId && !googleReady ? <p className="provider-hint">Google butonu hazirlaniyor...</p> : null}
          </div>
          <button
            type="button"
            className="provider-btn apple"
            onClick={() => quickProviderSignIn('apple')}
            disabled={isLoading}
          >
            Apple ile Test Giris (Mock)
          </button>
        </div>

        <form className="auth-form" onSubmit={submitSignIn}>
          <div className="field-row">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => applyProviderDefaults(event.target.value as AuthProvider)}
            >
              <option value="google">Google</option>
              <option value="apple">Apple</option>
            </select>
          </div>

          <div className="field-row">
            <label htmlFor="providerUserId">providerUserId</label>
            <input
              id="providerUserId"
              value={providerUserId}
              onChange={(event) => setProviderUserId(event.target.value)}
              required
            />
          </div>

          <div className="field-row">
            <label htmlFor="idToken">idToken</label>
            <input id="idToken" value={idToken} onChange={(event) => setIdToken(event.target.value)} required />
          </div>

          <div className="field-row">
            <label htmlFor="email">email</label>
            <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="field-row">
            <label htmlFor="fullName">fullName</label>
            <input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>

          <div className="field-row">
            <label htmlFor="accessToken">accessToken</label>
            <input id="accessToken" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} />
          </div>

          <div className="field-row">
            <label htmlFor="refreshToken">refreshToken</label>
            <input id="refreshToken" value={refreshToken} onChange={(event) => setRefreshToken(event.target.value)} />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Isleniyor...' : 'Sign In (Test)'}
            </button>
            <button type="button" className="ghost" onClick={() => applyProviderDefaults(provider)} disabled={isLoading}>
              Yeni Mock Token Uret
            </button>
          </div>
        </form>
      </section>

      <section className="card tools">
        <h2>Koruma Gerektiren Endpoint Testleri</h2>
        <p>
          API bu endpointlerde <code>x-user-id</code> header’i bekliyor.
        </p>

        <div className="field-row">
          <label htmlFor="activeUserId">x-user-id</label>
          <input
            id="activeUserId"
            value={activeUserId}
            onChange={(event) => setActiveUserId(event.target.value)}
            placeholder="sign-in sonrasi otomatik dolacak"
          />
        </div>

        <div className="tool-actions">
          <button type="button" onClick={fetchMe} disabled={isLoading}>
            GET /auth/me
          </button>
          <button type="button" onClick={fetchConnections} disabled={isLoading}>
            GET /auth/connections
          </button>
          <button type="button" className="danger" onClick={runSignOut} disabled={isLoading}>
            POST /auth/sign-out
          </button>
        </div>
      </section>

      <section className="status-panel">
        <p>
          <strong>Durum:</strong> {statusText}
        </p>
        {errorText ? <p className="error-text">{errorText}</p> : null}
      </section>

      <section className="card output-grid">
        <div>
          <h3>Me Result</h3>
          <pre>{result ? JSON.stringify(result, null, 2) : 'Henuz veri yok'}</pre>
        </div>
        <div>
          <h3>Connections</h3>
          <pre>{connections.length ? JSON.stringify(connections, null, 2) : 'Baglanti bulunamadi'}</pre>
        </div>
      </section>
    </main>
  )
}

export default App
