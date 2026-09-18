import { Route, Routes } from 'react-router-dom'
import Navbar from './components/common/Navbar'
import HomePage from './pages/HomePage'
import DesignerPage from './pages/DesignerPage'
import RoomPreviewPage from './pages/RoomPreviewPage'
import AboutPage from './pages/AboutPage'
import AuthPage from './pages/AuthPage'

function App() {
  return (
    <div className="min-h-screen bg-night-950">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/designer" element={<DesignerPage />} />
        <Route path="/designer/preview" element={<RoomPreviewPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    </div>
  )
}

export default App
