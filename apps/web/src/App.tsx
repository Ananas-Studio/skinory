import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { NavKey } from './pages/types'
import AdviserChatOpeningScreen from './pages/AdviserChatOpeningScreen'
import AdviserChattingScreen from './pages/AdviserChattingScreen'
import AdviserResultScreen from './pages/AdviserResultScreen'
import AdviserScanScreen from './pages/AdviserScanScreen'
import HomeScreen from './pages/HomeScreen'
import IntroductionScreen from './pages/IntroductionScreen'
import InventoryScreen from './pages/InventoryScreen'
import ScanScreen from './pages/ScanScreen'
import ScreenDirectory from './pages/ScreenDirectory'
import SearchScreen from './pages/SearchScreen'
import SignInScreen from './pages/SignInScreen'
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

function App() {
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
  const shouldShowBottomNav = !['/introduction', '/signin', '/pages'].includes(location.pathname)
  const activeNav = getActiveNav(location.pathname)

  return (
    <>
      <div className={shouldShowBottomNav ? 'pb-17' : undefined}>
        <Routes>
          <Route path="/" element={<Navigate to="/introduction" replace />} />
          <Route path="/pages" element={<ScreenDirectory />} />
          <Route path="/introduction" element={<IntroductionScreen />} />
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/inventory" element={<InventoryScreen />} />
          <Route path="/scan" element={<ScanScreen />} />
          <Route path="/adviser/scan" element={<AdviserScanScreen />} />
          <Route path="/adviser/result" element={<AdviserResultScreen />} />
          <Route path="/adviser/chat" element={<AdviserChatOpeningScreen />} />
          <Route path="/adviser/chatting" element={<AdviserChattingScreen />} />
          <Route path="*" element={<ScreenDirectory />} />
        </Routes>
      </div>

      {shouldShowBottomNav ? (
        <div className="fixed bottom-0 left-1/2 z-40 w-[min(100vw,var(--mobile-app-width))] -translate-x-1/2">
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

export default App
