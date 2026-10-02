import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/common/Navbar'
import { ToastProvider } from './components/common/Toast'
import HomePage from './pages/HomePage'

// The home page ships in the main bundle; every other page loads its own chunk on first visit,
// so a first-time visitor doesn't download the whole designer up front.
const DesignerPage = lazy(() => import('./pages/DesignerPage'))
const RoomPreviewPage = lazy(() => import('./pages/RoomPreviewPage'))
const FreeformDesignerPage = lazy(() => import('./pages/FreeformDesignerPage'))
const MyDesignsPage = lazy(() => import('./pages/MyDesignsPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function PageLoading() {
  return <div className="min-h-[60vh] bg-night-950" aria-busy="true" aria-label="Loading page" />
}

/** Designing needs an account. Signed-out visitors go to login and come back here after -
 * with the rug setup they picked (router state) intact. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user) return children
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search, fromState: location.state }} />
}

function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-night-950">
        <a
          href="#main-content"
          className="sr-only z-[200] rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Navbar />
        {/* The one <main> for every page; pages use plain wrappers inside it. */}
        <main id="main-content" tabIndex={-1} className="outline-none">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/designer" element={<RequireAuth><DesignerPage /></RequireAuth>} />
            {/* Open to everyone: this is where shared links land. */}
            <Route path="/designer/preview" element={<RoomPreviewPage />} />
            <Route path="/my-designs" element={<RequireAuth><MyDesignsPage /></RequireAuth>} />
            <Route path="/freeform" element={<RequireAuth><FreeformDesignerPage /></RequireAuth>} />
            {/* The old stand-alone About page now lives on the home page; keep old links working. */}
            <Route path="/about" element={<Navigate to="/#about-us" replace />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
