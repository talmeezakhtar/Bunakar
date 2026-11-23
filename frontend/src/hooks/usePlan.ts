import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/common/Toast'
import { useAuth } from './useAuth'

/** What Free allows: designs kept on the account, and the long side of downloaded images. */
export const FREE_LIMITS = { designs: 5, downloadPx: 1200 } as const

/**
 * The visitor's plan: 'guest' (not signed in), 'free' or 'pro'. Pro unlocks full-size images,
 * production exports and unlimited saved designs.
 */
export function usePlan() {
  const { user } = useAuth()
  const plan = user ? (user.plan ?? 'free') : 'guest'
  return { plan, isPro: plan === 'pro' } as const
}

/**
 * Gate for Pro features: `requirePro('Production exports')` returns true for Pro, otherwise
 * explains what Pro adds and offers the pricing page, and returns false.
 */
export function useProGate() {
  const { isPro, plan } = usePlan()
  const { showToast } = useToast()
  const navigate = useNavigate()
  return (feature: string): boolean => {
    if (isPro) return true
    showToast({
      tone: 'info',
      message: `${feature} come with Pro.`,
      detail: plan === 'guest' ? 'Sign in and go Pro for production files, full-size images and unlimited designs.' : 'Pro adds production files, full-size images and unlimited designs.',
      action: { label: 'See Pro', onClick: () => navigate('/pricing') },
      durationMs: 9000,
    })
    return false
  }
}
