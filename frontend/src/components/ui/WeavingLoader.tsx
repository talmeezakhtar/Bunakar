/** The loading loom (as in index.html): weft rows weaving up between warp threads. */
export default function WeavingLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid justify-items-center gap-3.5">
      <div className="relative h-[72px] w-14 border-y-4 border-[#6e4128]" aria-hidden="true">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#e6dcc6_0_2px,transparent_2px_7px)]" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-[repeating-linear-gradient(0deg,#a8352b_0_6px,#d9a13b_6px_9px,#a8352b_9px_15px,#2f3a72_15px_18px)] motion-safe:animate-[weave_1.6s_cubic-bezier(0.45,0,0.55,1)_infinite]" />
      </div>
      <p className="text-sm font-medium tracking-wide text-ink-2">{label}</p>
    </div>
  )
}
