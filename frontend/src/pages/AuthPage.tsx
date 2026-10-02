import { useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { CircleNotch, Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import VizierWatcher from '../components/auth/VizierWatcher'
import type { VizierMood } from '../components/auth/VizierWatcher'
import palaceImg from '../assets/palace-bg.webp'

type Mode = 'login' | 'register'
type Field = 'name' | 'email' | 'password' | null
type Status = 'idle' | 'submitting' | 'success'

const COPY: Record<Mode, { title: string; lede: string; submit: string; busy: string }> = {
  login: {
    title: 'Welcome back',
    lede: 'The royal vizier is watching. Keep your password to yourself and log in to pick up your saved rugs.',
    submit: 'Log in',
    busy: 'Opening the gate…',
  },
  register: {
    title: 'Create a seller account',
    lede: 'Save your rug designs to your account and share them with a link.',
    submit: 'Create account',
    busy: 'Weaving your account…',
  },
}

const inputClass =
  'w-full rounded-lg border border-night-600 bg-night-950/70 px-3.5 py-2.5 text-sm text-sand-100 placeholder:text-sand-300/70 transition-colors focus:border-gold-500 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-gold-500/25'

function AuthPage() {
  useDocumentTitle('Log in')
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState<Field>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorCount, setErrorCount] = useState(0)
  // Captured once: the session flips to "logged in" mid-submit, before the fly-away plays, so
  // checking the live `user` would cut the celebration short.
  const [arrivedLoggedIn] = useState(() => user !== null)

  const { from = '/', fromState } = (location.state as { from?: string; fromState?: unknown } | null) ?? {}
  const handleBanished = useCallback(
    () => navigate(from, { replace: true, state: fromState }),
    [navigate, from, fromState],
  )

  // Already signed in when they got here - nothing to do on this page.
  if (arrivedLoggedIn) return <Navigate to={from} replace state={fromState} />

  const copy = COPY[mode]
  const submitting = status === 'submitting'

  const mood: VizierMood =
    status === 'success'
      ? 'banished'
      : focused === 'password'
        ? showPassword
          ? 'gloating'
          : 'scheming'
        : focused === 'email' || focused === 'name'
          ? 'reading'
          : 'idle'
  // His staff's red light spills onto the card while he's after the password.
  const underSpell = mood === 'scheming' || mood === 'gloating'

  function switchMode(next: Mode) {
    if (next === mode || submitting) return
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setStatus('submitting')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, name)
      setStatus('success')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setErrorCount((n) => n + 1)
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-night-950 pt-16">
      <div className="absolute inset-0" aria-hidden="true">
        <img src={palaceImg} alt="" className="h-full w-full object-cover object-bottom opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-night-950/80 via-night-950/60 to-night-950" />
      </div>

      {/* Three columns on wide screens: the vizier on the left, the card dead centre, and an
          empty right column that keeps it there. Too narrow for that, he stands above it. */}
      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center justify-items-center gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)_minmax(0,1fr)] lg:gap-12">
        <div className="lg:justify-self-end lg:pr-6">
          <VizierWatcher mood={mood} errorCount={errorCount} onBanished={handleBanished} />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          // The card holds still on success - he vanishes from behind it, not in front of it.
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            boxShadow: underSpell
              ? '0 30px 80px rgba(0,0,0,0.55), 0 0 60px -12px rgba(200,40,60,0.5)'
              : '0 30px 80px rgba(0,0,0,0.55), 0 0 60px -12px rgba(200,40,60,0)',
          }}
          className="relative w-full max-w-md rounded-2xl border border-night-600 bg-night-900/95 p-6 backdrop-blur-md transition-shadow duration-500 sm:p-8"
        >
          <div className="relative mb-7 grid grid-cols-2 rounded-full border border-night-600 p-1" role="group" aria-label="Choose an option">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                className={`relative rounded-full bg-transparent px-3 py-2 text-sm font-medium pointer-coarse:min-h-11 transition-colors ${
                  mode === m ? 'text-night-950' : 'text-sand-300 hover:text-sand-100'
                }`}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 rounded-full bg-gold-500"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{m === 'login' ? 'Log in' : 'Create account'}</span>
              </button>
            ))}
          </div>

          <h1 className="font-display text-2xl tracking-wide text-sand-100 sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-sand-300/80">{copy.lede}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block text-sm text-sand-200">
                  Name
                </label>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  autoComplete="name"
                  required
                  maxLength={80}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm text-sand-200">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="auth-password" className="block text-sm text-sand-200">
                  Password
                </label>
                {mode === 'register' && <span className="text-xs text-sand-300/60">At least 8 characters</span>}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  maxLength={72}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  // Keep focus in the field, so the vizier keeps looming (or gloating) instead of
                  // backing off the moment the toggle is pressed.
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg bg-transparent text-sand-300 transition-colors hover:text-gold-400"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div aria-live="polite">
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2.5 text-sm text-red-200"
                >
                  <WarningCircle size={18} className="mt-px shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || status === 'success'}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-4 py-3 text-sm font-semibold tracking-wide text-night-950 shadow-[0_10px_30px_rgba(217,164,65,0.3)] transition-colors hover:bg-gold-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <CircleNotch size={18} className="animate-spin" />}
              {submitting ? copy.busy : copy.submit}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-sand-300/70">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="bg-transparent font-medium text-gold-400 underline-offset-4 transition-colors hover:text-gold-500 hover:underline"
            >
              {mode === 'login' ? 'Create an account' : 'Log in instead'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default AuthPage
