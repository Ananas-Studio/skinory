// ─── Auth API Client ────────────────────────────────────────────────────────

const API_BASE = '/api'

export interface AuthUser {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  phone: string | null
  birthday: string | null
  gender: string | null
  authProvider: 'google' | 'apple' | null
  isGuest: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthConnection {
  id: string
  provider: 'google' | 'apple'
  providerUserId: string
  email: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthMeResponse {
  user: AuthUser
  connections: AuthConnection[]
}

interface ApiOk<T> {
  ok: true
  data: T
}

interface ApiError {
  ok: false
  error: { code: string; message: string; details?: unknown }
}

type ApiResponse<T> = ApiOk<T> | ApiError

function headers(userId?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (userId) h['x-user-id'] = userId
  return h
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const body = (await res.json()) as ApiResponse<T>
  if (!body.ok) {
    throw new Error(body.error?.message ?? 'Request failed')
  }
  return body.data
}

// ─── Sign-in ────────────────────────────────────────────────────────────────

export interface SignInPayload {
  provider: 'google' | 'apple'
  providerUserId: string
  idToken: string
  email?: string
  fullName?: string
  avatarUrl?: string
}

export async function signInWithProvider(payload: SignInPayload): Promise<AuthMeResponse> {
  return request<AuthMeResponse>(`${API_BASE}/auth/provider/sign-in`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
}

// ─── Me / Validate ──────────────────────────────────────────────────────────

export async function fetchMe(userId: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: headers(userId),
  })
}

// ─── Sign-out ───────────────────────────────────────────────────────────────

export async function signOutUser(userId: string): Promise<void> {
  await request<{ signedOut: true }>(`${API_BASE}/auth/sign-out`, {
    method: 'POST',
    headers: headers(userId),
  })
}

// ─── Connections ────────────────────────────────────────────────────────────

export async function listConnections(userId: string): Promise<AuthConnection[]> {
  const data = await request<{ connections: AuthConnection[] }>(`${API_BASE}/auth/connections`, {
    method: 'GET',
    headers: headers(userId),
  })
  return data.connections
}

export async function addConnection(
  userId: string,
  payload: Omit<SignInPayload, 'fullName' | 'avatarUrl'>,
): Promise<AuthConnection> {
  const data = await request<{ connection: AuthConnection }>(`${API_BASE}/auth/connections`, {
    method: 'POST',
    headers: headers(userId),
    body: JSON.stringify(payload),
  })
  return data.connection
}

export async function removeConnection(userId: string, provider: 'google' | 'apple'): Promise<void> {
  await request<{ removedProvider: string }>(`${API_BASE}/auth/connections/${provider}`, {
    method: 'DELETE',
    headers: headers(userId),
  })
}

// ─── Profile ────────────────────────────────────────────────────────────────

export interface SkinProfileData {
  skinType: string | null
  sensitivityLevel: string | null
  fitzpatrickType: string | null
  acneProne: boolean | null
  notes: string | null
  climateType: string | null
  sunExposure: number | null
  pollutionExposure: number | null
  stressLevel: number | null
  sleepQuality: number | null
  hydrationLevel: number | null
  exerciseFrequency: string | null
  dietType: string | null
  smokingStatus: string | null
  screenTime: number | null
}

export interface AllergenOption {
  id: string
  slug: string
  name: string
  category: string
}

export interface PreferenceOption {
  id: string
  slug: string
  name: string
  category: string
}

export interface ProfileData {
  user: AuthUser
  connections: AuthConnection[]
  skinProfile: SkinProfileData | null
  skinConcerns: { id: string; slug: string; name: string; severity: number | null }[]
  allergens: AllergenOption[]
  productPreferences: PreferenceOption[]
}

export async function fetchProfile(userId: string): Promise<ProfileData> {
  return request<ProfileData>(`${API_BASE}/profile`, {
    method: 'GET',
    headers: headers(userId),
  })
}

export async function updateProfile(
  userId: string,
  data: { fullName?: string; avatarUrl?: string; phone?: string | null; birthday?: string | null; gender?: string | null },
): Promise<AuthUser> {
  const res = await request<{ user: AuthUser }>(`${API_BASE}/profile`, {
    method: 'PATCH',
    headers: headers(userId),
    body: JSON.stringify(data),
  })
  return res.user
}

export async function updateSkinProfile(
  userId: string,
  data: Partial<SkinProfileData>,
): Promise<void> {
  await request<unknown>(`${API_BASE}/profile/skin`, {
    method: 'PATCH',
    headers: headers(userId),
    body: JSON.stringify(data),
  })
}

export async function updateSkinConcerns(
  userId: string,
  concernIds: string[],
): Promise<void> {
  await request<unknown>(`${API_BASE}/profile/concerns`, {
    method: 'PUT',
    headers: headers(userId),
    body: JSON.stringify({ concernIds }),
  })
}

export interface SkinConcernOption {
  id: string
  slug: string
  name: string
  description: string | null
}

export async function fetchSkinConcerns(): Promise<SkinConcernOption[]> {
  return request<SkinConcernOption[]>(`${API_BASE}/profile/concerns/options`, {
    method: 'GET',
    headers: headers(),
  })
}

// ─── Allergens ──────────────────────────────────────────────────────────────

export async function fetchAllergenOptions(): Promise<AllergenOption[]> {
  return request<AllergenOption[]>(`${API_BASE}/profile/allergens/options`, {
    method: 'GET',
    headers: headers(),
  })
}

export async function updateAllergens(userId: string, allergenIds: string[]): Promise<void> {
  await request<unknown>(`${API_BASE}/profile/allergens`, {
    method: 'PUT',
    headers: headers(userId),
    body: JSON.stringify({ allergenIds }),
  })
}

// ─── Product Preferences ────────────────────────────────────────────────────

export async function fetchPreferenceOptions(): Promise<PreferenceOption[]> {
  return request<PreferenceOption[]>(`${API_BASE}/profile/preferences/options`, {
    method: 'GET',
    headers: headers(),
  })
}

export async function updatePreferences(userId: string, preferenceIds: string[]): Promise<void> {
  await request<unknown>(`${API_BASE}/profile/preferences`, {
    method: 'PUT',
    headers: headers(userId),
    body: JSON.stringify({ preferenceIds }),
  })
}
