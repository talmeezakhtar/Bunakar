import { Suspense, lazy, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AboutSection from '../components/home/AboutSection'
import Hero from '../components/home/Hero'
import Footer from '../components/common/Footer'
import PageMeta from '../components/common/PageMeta'

// Below the fold and the heaviest part of the page (pattern templates, generators, both rug
// renderers) - its own chunk, so the hero paints without waiting for it.
const loadCreateDesignSection = () => import('../components/home/CreateDesignSection')
const CreateDesignSection = lazy(loadCreateDesignSection)

function HomePage() {
  const location = useLocation()

  // Fetch it straight after first paint, so it's normally ready before anyone scrolls there.
  useEffect(() => {
    void loadCreateDesignSection()
  }, [])

  useEffect(() => {
    if (!location.hash) return
    // By id, not querySelector: a hash like "#123" isn't a valid CSS selector and would throw.
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location])

  return (
    <>
      <PageMeta
        description="Design a handwoven rug your way: pick a pattern, colors and size, then see it in a real room before it's woven."
        canonicalPath="/"
      />
      <Hero />
      {/* The placeholder keeps the section's id and height, so "#create-design" links still land. */}
      <Suspense fallback={<section id="create-design" className="min-h-screen scroll-mt-16 bg-night-950" aria-busy="true" />}>
        <CreateDesignSection />
      </Suspense>
      <AboutSection />
      <Footer />
    </>
  )
}

export default HomePage
