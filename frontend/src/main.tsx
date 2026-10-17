import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// index.html ships a static title/description/canonical so crawlers without JS, and the
// pre-mount flash, see something sane. Every route's PageMeta then renders its own via React
// 19's native title/meta/link hoisting - so the static ones must go first, synchronously,
// before that first commit, or the two coexist as duplicates.
document.querySelector('title')?.remove()
document.querySelector('meta[name="description"]')?.remove()
document.querySelector('link[rel="canonical"]')?.remove()

// A data router so the designer can use useBlocker to warn about unsaved changes. App keeps
// its own <Routes>, so every path is handed to it.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
