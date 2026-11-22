/** The "2D / 3D" switch above the designers' canvases. */
function ViewToggle({ value, onChange }: { value: '2d' | '3d'; onChange: (v: '2d' | '3d') => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="flex shrink-0 rounded-full bg-surface-2 p-0.5">
      {(['2d', '3d'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`min-h-8 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors pointer-coarse:min-h-10 ${
            value === v ? 'bg-paper text-ink shadow-[var(--shadow-soft)]' : 'text-muted hover:text-ink'
          }`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default ViewToggle
