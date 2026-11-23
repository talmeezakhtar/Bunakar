import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Footer from '../components/common/Footer'
import PageMeta from '../components/common/PageMeta'
import CraftSection from '../components/home/CraftSection'
import Hero from '../components/home/Hero'
import HowItWorks from '../components/home/HowItWorks'
import StartSection from '../components/home/StartSection'
import TourHome from '../components/home/TourHome'
import { canShow3D } from '../three/canShow3D'

function HomePage() {
  const location = useLocation()
  // Decided once per visit: the 3D courtyard tour where it can run, the 2D page everywhere else.
  const [tour] = useState(canShow3D)

  useEffect(() => {
    if (!location.hash) return
    // By id, not querySelector: a hash like "#123" isn't a valid CSS selector and would throw.
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location])

  return (
    <>
      <PageMeta
        description="Bunakar is a rug design studio: draw a hand-knotted, flatwoven, tufted or tiled rug knot by knot, from a classic style or from a photo, see it as real wool in a 3D room, and hand a weaver its knot chart. Free to start."
        canonicalPath="/"
      />
      {tour ? (
        <TourHome />
      ) : (
        <>
          <Hero />
          <StartSection />
          <HowItWorks />
          <CraftSection />
        </>
      )}
      <Footer />
    </>
  )
}

export default HomePage
