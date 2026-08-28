type TeamModeProps = {
  onBack: () => void
}

export default function TeamMode({ onBack }: TeamModeProps) {
  return (
    <div className="min-h-screen bg-black px-4 pb-10 pt-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-xs font-black text-cyan-300"
        >
          ← НАЗАД
        </button>

        <div className="mb-5 text-center">
          <h1
            className="text-xl font-black uppercase tracking-wider text-cyan-300"
            style={{ textShadow: '0 0 12px rgba(0,229,255,0.45)' }}
          >
            КОМАНДНЫЙ РЕЖИМ
          </h1>

          <p className="mt-1 text-[10px] font-bold text-white/40">
            раздел готовится к запуску
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/[0.02] p-12 text-center">
          <p className="text-sm font-bold text-white/30">
            Скоро здесь будет новый командный режим
          </p>
        </div>
      </div>
    </div>
  )
}
