// ─── Auth API Client ────────────────────────────────────────────────────────

const API_BASE = '/api'

export interface AuthUser {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
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

export interface ProfileData {
  user: AuthUser
  connections: AuthConnection[]
  skinProfile: {
    skinType: string | null
    sensitivityLevel: string | null
    acneProne: boolean | null
    notes: string | null
  } | null
  skinConcerns: { id: string; slug: string; name: string; severity: number | null }[]
}

export async function fetchProfile(userId: string): Promise<ProfileData> {
  return request<ProfileData>(`${API_BASE}/profile`, {
    method: 'GET',
    headers: headers(userId),
  })
}

export async function updateProfile(
  userId: string,
  data: { fullName?: string; avatarUrl?: string },
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
  data: { skinType?: string; sensitivityLevel?: string; acneProne?: boolean; notes?: string },
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
