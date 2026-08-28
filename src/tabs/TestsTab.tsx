import SwipeBack from '../components/SwipeBack'

type Props = {
  onOpenApplications: () => void
  onOpenArticles: () => void
  onBack: () => void
}

export default function TestsTab({ onOpenApplications, onOpenArticles, onBack }: Props) {
  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenApplications}
          className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-neon/40 bg-card/70 p-4 backdrop-blur-md transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-zayavki.webp"
            alt="Заявки"
            className="aspect-square w-full rounded-xl object-cover transition duration-300 group-hover:brightness-110"
          />
          <span
            className="text-sm font-extrabold tracking-wide text-ink"
            style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}
          >
            ЗАЯВКИ
          </span>
        </button>

        <button
          onClick={onOpenArticles}
          className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-neon/40 bg-card/70 p-4 backdrop-blur-md transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-articles.webp"
            alt="Статьи"
            className="aspect-square w-full rounded-xl object-cover transition duration-300 group-hover:brightness-110"
          />
          <span
            className="text-sm font-extrabold tracking-wide text-ink"
            style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}
          >
            СТАТЬИ
          </span>
        </button>
      </div>
    </SwipeBack>
  )
}
