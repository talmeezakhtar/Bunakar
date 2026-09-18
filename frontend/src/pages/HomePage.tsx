import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AboutSection from '../components/home/AboutSection'
import CreateDesignSection from '../components/home/CreateDesignSection'
import Hero from '../components/home/Hero'
import Footer from '../components/common/Footer'

function HomePage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const el = document.querySelector(location.hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location])

  return (
    <>
      <Hero />
      <CreateDesignSection />
      <AboutSection />
      <Footer />
    </>
  )
}

export default HomePage
