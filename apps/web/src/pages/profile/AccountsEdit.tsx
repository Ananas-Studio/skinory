import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Loader2, Plus, Trash2 } from '@skinory/ui/icons'
import { Button } from '@skinory/ui/components/button'
import { useAuth } from '../../contexts/auth-context'
import {
  fetchProfile,
  listConnections,
  removeConnection,
  type AuthConnection,
  type ProfileData,
} from '../../lib/auth-api'
import { ScreenFrame } from '../shared'

function AccountsEdit() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user!.id

  const [connections, setConnections] = useState<AuthConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProfile(userId)
      .then((data) => {
        if (!cancelled) setConnections(data.connections)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const handleRemove = useCallback(async (provider: 'google' | 'apple') => {
    if (connections.length <= 1) return
    setRemoving(provider)
    try {
      await removeConnection(userId, provider)
      setConnections((prev) => prev.filter((c) => c.provider !== provider))
    } catch (err) {
      console.error('Remove failed', err)
    } finally {
      setRemoving(null)
    }
  }, [userId, connections.length])

  if (loading) {
    return <ScreenFrame><div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[#EE886E]" /></div></ScreenFrame>
  }

  return (
    <div className="font-[Geist,'Avenir_Next','Segoe_UI',sans-serif] min-h-screen bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-[#f4f4f5]">
        <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#09090b]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">Connected Accounts</h1>
      </div>

      <div className="flex flex-col gap-4 p-4 pb-16">
        <p className="text-sm text-[#71717a]">Manage your sign-in methods. You must keep at least one connection.</p>

        <div className="flex flex-col gap-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between rounded-xl border border-[#e4e4e7] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#f4f4f5]">
                  {conn.provider === 'google' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.46-3.06-.4C3.24 15.6 3.89 8.55 8.95 8.28c1.32.07 2.24.75 3.01.8 1.15-.23 2.25-.91 3.48-.82 1.48.12 2.6.73 3.33 1.78-3.05 1.83-2.33 5.87.54 7 .54 1.35-1.27 2.69-2.26 3.24zM12.03 8.22c-.14-2.43 1.87-4.5 4.1-4.72.3 2.8-2.55 4.9-4.1 4.72z"/></svg>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium capitalize">{conn.provider}</span>
                  <span className="text-xs text-[#71717a]">{conn.email ?? conn.providerUserId}</span>
                </div>
              </div>
              {connections.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemove(conn.provider)}
                  disabled={removing === conn.provider}
                >
                  {removing === conn.provider ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AccountsEdit
