import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Footer from '../components/common/Footer'
import PageMeta from '../components/common/PageMeta'
import { ROUTES } from '../seo/routeMeta'
import TourHome from '../components/home/TourHome'

function HomePage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    // By id, not querySelector: a hash like "#123" isn't a valid CSS selector and would throw.
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location])

  return (
    <>
      <PageMeta {...ROUTES['/']} canonicalPath="/" />
      <TourHome />
      <Footer />
    </>
  )
}

export default HomePage
