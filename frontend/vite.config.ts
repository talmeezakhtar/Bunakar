import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The API address is baked into the bundle at build time. Without it the app falls back to
  // localhost, which "works" on the build machine and fails for every real visitor - so stop here.
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL is not set. Point it at the deployed API, e.g. https://bunakar-api.onrender.com')
  }
  // Link-preview images need an absolute URL. Vercel provides the production domain itself;
  // anywhere else set VITE_SITE_URL. Without either it falls back to a relative path.
  const siteUrl = (
    env.VITE_SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  ).replace(/\/$/, '')
  return {
    plugins: [
      react(),
      tailwindcss(),
      { name: 'site-url', transformIndexHtml: (html: string) => html.replaceAll('__SITE_URL__', siteUrl) },
    ],
  }
})
