import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/common/Navbar'
import { ToastProvider } from './components/common/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import HomePage from './pages/HomePage'
import WeavingLoader from './components/ui/WeavingLoader'

// The home page ships in the main bundle; every other page loads its own chunk on first visit,
// so a first-time visitor doesn't download the whole designer up front.
const RoomPreviewPage = lazy(() => import('./pages/RoomPreviewPage'))
const MyDesignsPage = lazy(() => import('./pages/MyDesignsPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const CreditsPage = lazy(() => import('./pages/CreditsPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
import LegacyDesignerRedirect from './pages/LegacyDesignerRedirect'
const StudioPage = lazy(() => import('./pages/StudioPage'))
const FabricsPage = lazy(() => import('./pages/FabricsPage'))

function PageLoading() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-paper pt-16" aria-busy="true">
      <WeavingLoader label="Loading page" />
    </div>
  )
}

/** Pages that need an account (My designs). Designing itself is open to guests. Signed-out
 * visitors go to login and come back here after, with router state intact. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user) return children
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search, fromState: location.state }} />
}

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
      <div className="min-h-screen bg-paper">
        <a
          href="#main-content"
          className="sr-only z-[200] rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Navbar />
        {/* The one <main> for every page; pages use plain wrappers inside it. */}
        <main id="main-content" tabIndex={-1} className="outline-none">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Designers are open to guests; saving asks them to sign in (useDesignPersistence). */}
            <Route path="/designer" element={<LegacyDesignerRedirect kind="tile" />} />
            {/* Open to everyone: this is where shared links land. */}
            <Route path="/designer/preview" element={<RoomPreviewPage />} />
            <Route path="/my-designs" element={<RequireAuth><MyDesignsPage /></RequireAuth>} />
            <Route path="/freeform" element={<LegacyDesignerRedirect kind="freeform" />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/fabrics" element={<FabricsPage />} />
            <Route path="/fabrics/:id" element={<FabricsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<LegalPage doc="privacy" />} />
            <Route path="/terms" element={<LegalPage doc="terms" />} />
            <Route path="/cancellation" element={<LegalPage doc="cancellation" />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </main>
      </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
