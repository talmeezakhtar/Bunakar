import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, CircleNotch, Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import PageMeta from '../components/common/PageMeta'
import { StarRule } from '../components/ui/Ornament'

type Mode = 'login' | 'register'
type Status = 'idle' | 'submitting' | 'success'

const COPY: Record<Mode, { title: string; lede: string; submit: string; busy: string }> = {
  login: {
    title: 'Welcome back',
    lede: 'Log in to pick up your saved rugs, preview them in a room and share them.',
    submit: 'Log in',
    busy: 'Logging in…',
  },
  register: {
    title: 'Create your account',
    lede: 'Save your rug designs to your account and share them with a link.',
    submit: 'Create account',
    busy: 'Creating your account…',
  },
}

const EASE = [0.22, 1, 0.36, 1] as const

const inputClass =
  'min-h-12 w-full rounded-xl border border-white/60 bg-white/55 px-3.5 py-2.5 text-base text-ink shadow-[inset_0_1px_2px_rgba(31,27,22,0.06)] backdrop-blur-sm placeholder:text-muted-2 transition-[border-color,background-color,box-shadow] duration-200 hover:bg-white/70 focus:border-accent focus:bg-white/80 focus:outline-none focus:ring-4 focus:ring-accent/15'

/**
 * Log in and sign up, over the bazaar: a frosted-glass card on the street scene, rising in with
 * its contents in sequence. Behaviour is unchanged: it returns visitors to where they were headed
 * (with the setup they picked), and explains why when the designer sent them here.
 */
function AuthPage() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  // Captured once: the session flips to "logged in" mid-submit, before the success moment plays,
  // so checking the live `user` would cut it short.
  const [arrivedLoggedIn] = useState(() => user !== null)

  const { from = '/', fromState, reason } =
    (location.state as { from?: string; fromState?: unknown; reason?: 'save' | 'continue' } | null) ?? {}
  // Signed in: a short beat for the tick, then back to where they were headed.
  useEffect(() => {
    if (status !== 'success') return
    const t = window.setTimeout(() => navigate(from, { replace: true, state: fromState }), reduce ? 0 : 650)
    return () => window.clearTimeout(t)
  }, [status, navigate, from, fromState, reduce])

  // Already signed in when they got here - nothing to do on this page.
  if (arrivedLoggedIn) return <Navigate to={from} replace state={fromState} />

  // Sent here from the designer: say why, and that the rug is safe.
  const copy = reason
    ? {
        ...COPY[mode],
        lede:
          reason === 'continue'
            ? 'Log in or create an account to save your rug and see it in a room. Your design is kept while you do.'
            : 'Log in or create an account to save your rug. Your design is kept while you do.',
      }
    : COPY[mode]
  const submitting = status === 'submitting'
  const done = status === 'success'

  function switchMode(next: Mode) {
    if (next === mode || submitting || done) return
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || done) return
    setError(null)
    setStatus('submitting')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, name)
      setStatus('success')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  // The card's contents arrive one after another.
  const item = reduce
    ? {}
    : { variants: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } } }

  return (
    <div className="relative isolate min-h-[100dvh] overflow-hidden pt-16">
      <PageMeta title="Log in" description="Log in to Bunakar to save your rug designs and come back to them anytime." canonicalPath="/login" />

      {/* The kilim-lined tent, drifting slowly closer, under a warm wash that keeps the card legible. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <motion.img
          src="/images/login-tent.jpg"
          alt=""
          className="h-full w-full object-cover blur-[2px]"
          initial={reduce ? false : { scale: 1.12 }}
          animate={reduce ? undefined : { scale: 1.02 }}
          transition={{ duration: 18, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(251,248,242,0.08)_0%,rgba(120,60,30,0.28)_70%,rgba(40,22,14,0.55)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(251,248,242,0.35)] via-transparent to-[rgba(40,22,14,0.35)]" />
      </div>

      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32, scale: 0.97 }}
          animate={done && !reduce ? { opacity: 1, y: -6, scale: 1.01 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/50 bg-[rgba(251,248,242,0.58)] p-7 shadow-[0_30px_80px_-24px_rgba(40,22,14,0.55),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl backdrop-saturate-150 sm:p-9"
        >
          {/* A soft highlight across the glass. */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-1/4 -top-1/2 h-full w-[150%] rotate-[-12deg] bg-gradient-to-b from-white/45 to-transparent" />

          <motion.div className="relative" initial={reduce ? false : 'hidden'} animate="show" variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}>
            <motion.div {...item} className="flex justify-center">
              <img src="/logo-mark-96.png" alt="" width={56} height={56} className="h-14 w-14 drop-shadow-[0_6px_12px_rgba(40,22,14,0.25)]" />
            </motion.div>

            <motion.div {...item}>
              <div className="relative mx-auto mt-6 grid grid-cols-2 rounded-full border border-white/60 bg-white/35 p-1 backdrop-blur" role="group" aria-label="Choose an option">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    aria-pressed={mode === m}
                    className={`relative min-h-11 rounded-full bg-transparent px-3 text-[0.95rem] font-medium transition-colors duration-300 ${mode === m ? 'text-paper' : 'text-ink-2 hover:text-ink'}`}
                  >
                    {mode === m && (
                      <motion.span
                        layoutId="auth-mode-pill"
                        className="absolute inset-0 rounded-full bg-gradient-to-b from-accent to-accent-deep shadow-[0_6px_16px_-6px_rgba(168,53,43,0.7)]"
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{m === 'login' ? 'Log in' : 'Create account'}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div {...item} className="mt-7 text-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <h1 className="font-display text-[2.1rem] font-semibold leading-tight text-ink">{copy.title}</h1>
                  <p className="mx-auto mt-2 max-w-sm leading-relaxed text-ink-2">{copy.lede}</p>
                </motion.div>
              </AnimatePresence>
              <StarRule className="mx-auto mt-5 max-w-[12rem]" />
            </motion.div>

            <motion.form {...item} onSubmit={handleSubmit} className="mt-6 space-y-4">
              <AnimatePresence initial={false}>
                {mode === 'register' && (
                  <motion.div
                    key="name"
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reduce ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-ink">
                      Name
                    </label>
                    <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} className={inputClass} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="auth-password" className="block text-sm font-medium text-ink">
                    Password
                  </label>
                  {mode === 'register' && <span className="text-sm text-ink-2">At least 8 characters</span>}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    maxLength={72}
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    // Keep focus (and the caret) in the field while toggling.
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl bg-transparent text-ink-2 transition-colors hover:text-accent"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={showPassword ? 'hide' : 'show'} initial={reduce ? false : { opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
                        {showPassword ? <EyeSlash size={19} /> : <Eye size={19} />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <div aria-live="polite">
                <AnimatePresence>
                  {error && (
                    <motion.p
                      role="alert"
                      initial={reduce ? false : { opacity: 0, y: -6 }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }}
                      exit={reduce ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft/90 px-3 py-2.5 text-sm text-accent-deep"
                    >
                      <WarningCircle size={18} className="mt-px shrink-0" />
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                type="submit"
                disabled={submitting || done}
                whileHover={reduce || submitting || done ? undefined : { y: -2 }}
                whileTap={reduce || submitting || done ? undefined : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className="group relative flex min-h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-accent to-accent-deep px-4 text-base font-semibold text-paper shadow-[0_14px_30px_-12px_rgba(168,53,43,0.75),inset_0_1px_0_rgba(255,255,255,0.25)] transition-shadow hover:shadow-[0_18px_36px_-12px_rgba(168,53,43,0.85),inset_0_1px_0_rgba(255,255,255,0.3)] disabled:cursor-not-allowed"
              >
                {/* A sheen that sweeps across on hover. */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition-[left,opacity] duration-700 ease-out group-hover:left-[110%] group-hover:opacity-100 motion-reduce:hidden" />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={status}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="relative inline-flex items-center gap-2"
                  >
                    {done ? (
                      <>
                        <Check size={19} weight="bold" /> Welcome
                      </>
                    ) : submitting ? (
                      <>
                        <CircleNotch size={18} className="animate-spin" /> {copy.busy}
                      </>
                    ) : (
                      <>
                        {copy.submit} <ArrowRight size={18} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </motion.form>

            <motion.p {...item} className="mt-5 text-center text-[0.95rem] text-ink-2">
              {mode === 'login' ? 'New here? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="inline-flex min-h-11 items-center bg-transparent font-semibold text-accent underline-offset-4 transition-colors hover:text-accent-deep hover:underline"
              >
                {mode === 'login' ? 'Create an account' : 'Log in instead'}
              </button>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default AuthPage
