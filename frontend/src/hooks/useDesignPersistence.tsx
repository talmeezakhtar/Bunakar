import { useEffect, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { setLogoutGuard, useAuth } from './useAuth'
import { useToast } from '../components/common/Toast'
import { isPlanLimit } from '../services/api'
import { useConfirm } from '../components/ui/ConfirmDialog'
import UnsavedChangesDialog from '../components/tileDesigner/UnsavedChangesDialog'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type DesignKind = 'tile' | 'freeform' | 'studio'

/** What a pending action does once a guest has signed in and come back. */
type PendingAction = 'save' | 'continue'

type Draft<S> = { v: 1; state: S; pending?: PendingAction; at: number }

const draftKey = (kind: DesignKind) => `bunakar.draft.v1.${kind}`

export function readDraft<S>(kind: DesignKind): Draft<S> | null {
  try {
    const raw = localStorage.getItem(draftKey(kind))
    const draft = raw ? (JSON.parse(raw) as Draft<S>) : null
    return draft?.v === 1 ? draft : null
  } catch {
    return null
  }
}

function writeDraft<S>(kind: DesignKind, draft: Draft<S> | null) {
  try {
    if (draft) localStorage.setItem(draftKey(kind), JSON.stringify(draft))
    else localStorage.removeItem(draftKey(kind))
  } catch {
    // Storage full or blocked: the draft only lives in memory for this visit.
  }
}

type SavedRecord = { id: string; name: string }

type Options<S, R extends SavedRecord> = {
  kind: DesignKind
  /** The live design (the undo history's present). */
  state: S
  /** Swap the whole canvas, clearing undo history. */
  replaceAll: (next: S) => void
  /** The design the page opened with; it counts as saved, so a fresh page is clean. */
  initial: S
  idOf: (s: S) => string | null
  nameOf: (s: S) => string
  save: (s: S) => Promise<R>
  fromRecord: (r: R) => S
  remove: (id: string) => Promise<void>
  list: () => Promise<R[]>
  /** Where "Continue" goes once the design is saved. */
  previewPath: (saved: R) => string
  /** A draft is restored only on a plain visit - not when the page opened a design or a setup. */
  canRestoreDraft: boolean
  /** Called after any canvas swap (load, new, restore) so the page can reset its tools. */
  onReset?: (next: S) => void
  /** For states plain JSON can't hold (the studio's byte charts): how a draft is written and read. */
  toDraft?: (s: S) => unknown
  fromDraft?: (d: unknown) => S
}

/**
 * Everything the two designers share about keeping work: save / continue / load / new / delete,
 * the "unsaved changes" guard (in-app links, logout and closing the tab), a local draft that
 * autosaves every change, and guest mode - a visitor designs without an account, and Save or
 * Continue sends them to sign in and then finishes what they asked for.
 */
export function useDesignPersistence<S, R extends SavedRecord>(opts: Options<S, R>) {
  const { kind, state, replaceAll, initial, idOf, nameOf, fromRecord, previewPath } = opts
  const { user } = useAuth()
  const signedIn = !!user
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const confirm = useConfirm()

  // "Unsaved" = different from what was last saved or opened (compared by reference, so undoing
  // back to the saved version counts as clean again).
  // Drafts hold what plain JSON can (the studio encodes its charts); everything else is stored as is.
  const toDraft = (s: S): S => (optsRef.current.toDraft ? (optsRef.current.toDraft(s) as S) : s)
  const fromDraft = (d: S): S => (optsRef.current.fromDraft ? optsRef.current.fromDraft(d) : d)

  const [savedState, setSavedState] = useState<S>(initial)
  const dirty = state !== savedState
  // Read by navigation, logout and unload handlers, which fire outside React's render.
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [myDesigns, setMyDesigns] = useState<R[]>([])
  const [leavePrompt, setLeavePrompt] = useState<{ resolve: (ok: boolean) => void } | null>(null)
  const [leaveStatus, setLeaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  /** Replace the canvas. `clean` marks it as saved; a restored draft is not. */
  function resetTo(next: S, { clean = true }: { clean?: boolean } = {}) {
    replaceAll(next)
    if (clean) {
      setSavedState(next)
      dirtyRef.current = false
    }
    optsRef.current.onReset?.(next)
  }

  // Keep a local draft of every unsaved change, so a refresh, a crash or a sign-in loses nothing.
  useEffect(() => {
    if (!dirty) return
    // A pending "save when back from sign-in" rides along until it has been carried out.
    const t = window.setTimeout(() => writeDraft(kind, { v: 1, state: toDraft(state), pending: readDraft<S>(kind)?.pending, at: Date.now() }), 400)
    return () => window.clearTimeout(t)
  }, [kind, state, dirty])
  // Leaving inside that 400 ms (closing the tab, reloading, moving to another page) keeps the last change too.
  useEffect(() => {
    // Keeps a pending "save when back from sign-in", so a late flush can never drop it.
    const flush = () => dirtyRef.current && writeDraft(kind, { v: 1, state: toDraft(optsRef.current.state), pending: readDraft<S>(kind)?.pending, at: Date.now() })
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // toDraft reads optsRef, so it's current whenever this runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  // On a plain visit, pick up where the visitor left off; finish a save they started as a guest.
  // Decided on the first render, so the page knows not to lay a fresh layout over the draft.
  const [startDraft] = useState(() => {
    const draft = readDraft<S>(kind)
    if (!draft) return null
    if (draft.pending && signedIn) return draft
    return opts.canRestoreDraft ? draft : null
  })
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || !startDraft) return
    restoredRef.current = true
    resetTo(fromDraft(startDraft.state), { clean: false })
    // A save started as a guest is finished by the effect below, once the account is known.
    if (startDraft.pending) return
    showToast({
      tone: 'info',
      message: 'We restored the rug you were working on.',
      action: {
        label: 'Start fresh instead',
        onClick: () => {
          writeDraft(kind, null)
          resetTo(initial)
        },
      },
    })
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Finish what a guest started before signing in (save, or see it in a room), once: as soon as
  // the account is known, whether that's on the first render back or a moment later.
  const resumedRef = useRef(false)
  useEffect(() => {
    if (!signedIn || resumedRef.current) return
    const draft = readDraft<S>(kind)
    if (!draft?.pending) return
    resumedRef.current = true
    const restored = fromDraft(draft.state)
    resetTo(restored, { clean: false })
    writeDraft(kind, { ...draft, pending: undefined })
    void (draft.pending === 'continue' ? handleContinue(restored) : handleSave(restored))
    // Runs when sign-in becomes known; the handlers read the latest options through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    optsRef.current
      .list()
      .then((designs) => !cancelled && setMyDesigns(designs))
      .catch(() => {
        // Offline: the list stays empty; saving reports the problem.
      })
    return () => {
      cancelled = true
    }
  }, [signedIn])

  // Guests have nothing on the server to lose (their draft is kept), so only accounts are asked.
  const guard = () => signedIn && dirtyRef.current
  const blocker = useBlocker(({ currentLocation, nextLocation }) => guard() && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    confirmLeave().then((ok) => (ok ? blocker.proceed() : blocker.reset()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state])
  useEffect(() => {
    setLogoutGuard(confirmLeave)
    return () => setLogoutGuard(null)
  })
  useEffect(() => {
    // Refresh/close can't show a custom dialog - browsers only allow their own prompt.
    const onUnload = (e: BeforeUnloadEvent) => {
      if (guard()) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  })

  /** Sends a guest to sign in, keeping the draft and what they were doing. */
  function signInFirst(pending: PendingAction, current: S) {
    writeDraft(kind, { v: 1, state: toDraft(current), pending, at: Date.now() })
    dirtyRef.current = false
    navigate('/login', { state: { from: location.pathname, reason: pending } })
  }

  async function persist(current: S): Promise<R> {
    const saved = await optsRef.current.save(current)
    resetTo(fromRecord(saved))
    writeDraft(kind, null)
    setMyDesigns((prev) => (prev.some((d) => d.id === saved.id) ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev]))
    return saved
  }

  function reportError(err: unknown, current: S = state) {
    if (isPlanLimit(err)) {
      // Not a failure to retry: the toast explains the limit, so no "check your connection".
      setSaveStatus('idle')
      // Keep this rug on the device so nothing is lost while they decide - and since it's kept,
      // "See Pro" can leave the page without the unsaved-changes prompt getting in the way.
      writeDraft(kind, { v: 1, state: toDraft(current), at: Date.now() })
      dirtyRef.current = false
      showToast({
        tone: 'info',
        message: err.message,
        action: { label: 'See Pro', onClick: () => navigate('/pricing') },
        durationMs: 9000,
      })
      return
    }
    setSaveStatus('error')
    showToast({
      tone: 'error',
      message: err instanceof Error ? `Couldn't save your rug. ${err.message}` : "Couldn't save your rug.",
    })
  }

  async function handleSave(current: S = state) {
    if (!signedIn) return signInFirst('save', current)
    setSaveStatus('saving')
    try {
      await persist(current)
      setSaveStatus('saved')
      showToast({ tone: 'success', message: 'Rug saved.', durationMs: 2500 })
      window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
    } catch (err) {
      reportError(err, current)
    }
  }

  /**
   * Shows the rug in rooms straight from this browser's copy - for guests, and whenever the server
   * can't be reached. Nothing is lost: "Back to editing" restores the same draft.
   */
  function previewLocally(current: S, message: string) {
    writeDraft(kind, { v: 1, state: toDraft(current), at: Date.now() })
    dirtyRef.current = false
    setSaveStatus('idle')
    navigate(`/designer/preview?draft=${kind}`)
    showToast({ tone: 'info', message })
  }

  async function handleContinue(current: S = state) {
    if (!signedIn) return previewLocally(current, 'Previewing from this device. Sign in and save to share a link.')
    setSaveStatus('saving')
    try {
      const saved = await persist(current)
      setSaveStatus('idle')
      navigate(previewPath(saved))
    } catch (err) {
      previewLocally(
        current,
        isPlanLimit(err)
          ? 'Your Free plan already keeps its 5 designs, so this preview comes from your browser. Delete one or go Pro to save it.'
          : "We couldn't reach the server, so this preview comes from your browser. Your rug isn't saved yet.",
      )
    }
  }

  /** Resolves true once it's fine to drop the canvas - saved, discarded, or clean. */
  function confirmLeave(): Promise<boolean> {
    if (!guard()) return Promise.resolve(true)
    setLeaveStatus('idle')
    return new Promise((resolve) => setLeavePrompt({ resolve }))
  }

  function closeLeavePrompt(ok: boolean) {
    if (ok) {
      dirtyRef.current = false
      writeDraft(kind, null)
    }
    leavePrompt?.resolve(ok)
    setLeavePrompt(null)
  }

  async function handleLeaveSave() {
    setLeaveStatus('saving')
    try {
      await persist(state)
      closeLeavePrompt(true)
    } catch {
      setLeaveStatus('error')
    }
  }

  async function handleNew(fresh: S) {
    if (!(await confirmLeave())) return
    writeDraft(kind, null)
    resetTo(fresh)
  }

  async function handleLoad(id: string, load: (id: string) => Promise<R | null>) {
    if (!(await confirmLeave())) return
    const record = myDesigns.find((d) => d.id === id && 'updatedAt' in d) ?? (await load(id))
    if (record) resetTo(fromRecord(record))
    else showToast({ tone: 'error', message: "We couldn't open that design. It may have been deleted." })
  }

  async function handleDelete(fresh: S) {
    const id = idOf(state)
    if (!id) return
    const ok = await confirm({ title: `Delete “${nameOf(state)}”?`, body: "This can't be undone.", confirmLabel: 'Delete', tone: 'danger' })
    if (!ok) return
    try {
      await optsRef.current.remove(id)
    } catch (err) {
      showToast({ tone: 'error', message: err instanceof Error ? `Couldn't delete this rug. ${err.message}` : "Couldn't delete this rug." })
      return
    }
    setMyDesigns((prev) => prev.filter((d) => d.id !== id))
    writeDraft(kind, null)
    resetTo(fresh)
  }

  const leaveDialog = leavePrompt ? (
    <UnsavedChangesDialog
      designName={nameOf(state)}
      saving={leaveStatus === 'saving'}
      error={leaveStatus === 'error'}
      onSave={handleLeaveSave}
      onDiscard={() => closeLeavePrompt(true)}
      onCancel={() => closeLeavePrompt(false)}
    />
  ) : null

  return {
    signedIn,
    /** The page opened on a restored draft: don't lay a template or generated layout over it. */
    draftRestored: !!startDraft,
    dirty,
    saveStatus,
    myDesigns,
    resetTo,
    handleSave: () => handleSave(),
    handleContinue: () => handleContinue(),
    handleNew,
    handleLoad,
    handleDelete,
    leaveDialog,
    /** True while a dialog owns the keyboard. */
    leaveOpen: !!leavePrompt,
  }
}
