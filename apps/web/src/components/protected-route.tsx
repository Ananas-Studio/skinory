import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { Loader2 } from '@skinory/ui/icons'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#EE886E]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return <>{children}</>
}
