import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { NavKey } from './pages/types'
import { AuthProvider } from './contexts/auth-context'
import ProtectedRoute from './components/protected-route'
import AdviserChatOpeningScreen from './pages/AdviserChatOpeningScreen'
import AdviserChattingScreen from './pages/AdviserChattingScreen'
import AdviserResultScreen from './pages/AdviserResultScreen'
import AdviserScanScreen from './pages/AdviserScanScreen'
import HomeScreen from './pages/HomeScreen'
import IntroductionScreen from './pages/IntroductionScreen'
import InventoryScreen from './pages/InventoryScreen'
import IngredientCaptureScreen from './pages/IngredientCaptureScreen'
import ProfileScreen from './pages/ProfileScreen'
import AllergiesEdit from './pages/profile/AllergiesEdit'
import AccountsEdit from './pages/profile/AccountsEdit'
import LifestyleEdit from './pages/profile/LifestyleEdit'
import PersonalInfoEdit from './pages/profile/PersonalInfoEdit'
import PreferencesEdit from './pages/profile/PreferencesEdit'
import SkinProfileEdit from './pages/profile/SkinProfileEdit'
import ScanScreen from './pages/ScanScreen'
import ScreenDirectory from './pages/ScreenDirectory'
import SearchScreen from './pages/SearchScreen'
import SignInScreen from './pages/SignInScreen'
import SocialScannerScreen from './pages/SocialScannerScreen'
import ProductDetailScreen from './pages/ProductDetailScreen'
import SplashScreen from './pages/SplashScreen'
import { BottomNav } from './pages/shared'

function getActiveNav(pathname: string): NavKey {
  if (pathname.startsWith('/inventory')) {
    return 'inventory'
  }

  if (pathname.startsWith('/scan')) {
    return 'scan'
  }

  if (pathname.startsWith('/adviser')) {
    return 'adviser'
  }

  return 'home'
}

function AppRoutes() {
  const location = useLocation()
  const [showLaunchSplash, setShowLaunchSplash] = useState(true)

  useEffect(() => {
    const splashDurationMs = 1800
    const timeoutId = window.setTimeout(() => {
      setShowLaunchSplash(false)
    }, splashDurationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const shouldRenderSplash = showLaunchSplash && location.pathname !== '/pages'
  const shouldShowBottomNav = !['/introduction', '/signin', '/pages', '/social'].includes(location.pathname) && !location.pathname.startsWith('/profile') && !location.pathname.startsWith('/product')
  const activeNav = getActiveNav(location.pathname)

  return (
    <>
      <div className={shouldShowBottomNav ? 'pb-17' : undefined}>
        <Routes>
          <Route path="/" element={<Navigate to="/introduction" replace />} />
          <Route path="/pages" element={<ScreenDirectory />} />
          <Route path="/introduction" element={<IntroductionScreen />} />
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchScreen /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><InventoryScreen /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><ScanScreen /></ProtectedRoute>} />
          <Route path="/scan/ingredients" element={<ProtectedRoute><IngredientCaptureScreen /></ProtectedRoute>} />
          <Route path="/adviser/scan" element={<ProtectedRoute><AdviserScanScreen /></ProtectedRoute>} />
          <Route path="/adviser/result" element={<ProtectedRoute><AdviserResultScreen /></ProtectedRoute>} />
          <Route path="/adviser/chat" element={<ProtectedRoute><AdviserChatOpeningScreen /></ProtectedRoute>} />
          <Route path="/adviser/chatting" element={<ProtectedRoute><AdviserChattingScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/profile/personal" element={<ProtectedRoute><PersonalInfoEdit /></ProtectedRoute>} />
          <Route path="/profile/skin" element={<ProtectedRoute><SkinProfileEdit /></ProtectedRoute>} />
          <Route path="/profile/allergies" element={<ProtectedRoute><AllergiesEdit /></ProtectedRoute>} />
          <Route path="/profile/preferences" element={<ProtectedRoute><PreferencesEdit /></ProtectedRoute>} />
          <Route path="/profile/lifestyle" element={<ProtectedRoute><LifestyleEdit /></ProtectedRoute>} />
          <Route path="/profile/accounts" element={<ProtectedRoute><AccountsEdit /></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><SocialScannerScreen /></ProtectedRoute>} />
          <Route path="/product/:id" element={<ProtectedRoute><ProductDetailScreen /></ProtectedRoute>} />
          <Route path="*" element={<ScreenDirectory />} />
        </Routes>
      </div>

      {shouldShowBottomNav ? (
        <div className="fixed bottom-0 left-1/2 z-40 w-[min(100vw,var(--mobile-app-width))] -translate-x-1/2 bg-white">
          <BottomNav active={activeNav} />
        </div>
      ) : null}

      {shouldRenderSplash ? (
        <div className="fixed inset-0 z-50">
          <SplashScreen />
        </div>
      ) : null}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
