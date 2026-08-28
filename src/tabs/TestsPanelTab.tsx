import SwipeBack from '../components/SwipeBack'

type Props = {
  onBack: () => void
}

export default function TestsPanelTab({ onBack }: Props) {
  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-6 pb-10 pt-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>

      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-neon/30 bg-card/70 p-10 backdrop-blur-md"
        style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
      >
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-neon/40 bg-neon/10"
          style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}
        >
          <span className="text-2xl font-extrabold text-neon">?</span>
        </div>
        <h2
          className="text-lg font-extrabold tracking-wide text-ink"
          style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}
        >
          ТЕСТЫ
        </h2>
        <p className="mt-3 text-center text-sm text-ink/60">
          Раздел скоро появится
        </p>
      </div>
    </SwipeBack>
  )
}
