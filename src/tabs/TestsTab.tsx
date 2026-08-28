import SwipeBack from '../components/SwipeBack'

type Props = {
  onOpenApplications: () => void
  onOpenArticles: () => void
  onBack: () => void
}

export default function TestsTab({ onOpenApplications, onOpenArticles, onBack }: Props) {
  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-5 pb-10 pt-10">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>

      <div
        className="mb-6 overflow-hidden rounded-2xl border border-neon/20"
        style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.4)' }}
      >
        <img
          src="/banner-tests.webp"
          alt="Тесты"
          className="block h-auto w-full object-cover"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onOpenApplications}
          className="group flex flex-col items-center gap-3 rounded-2xl border border-neon/30 bg-card/70 p-4 backdrop-blur-md transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
        >
          <img
            src="/banner-zayavki.webp"
            alt="Заявки"
            className="h-20 w-20 rounded-xl object-cover transition duration-300 group-hover:brightness-110"
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
          className="group flex flex-col items-center gap-3 rounded-2xl border border-neon/30 bg-card/70 p-4 backdrop-blur-md transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
        >
          <img
            src="/banner-articles.webp"
            alt="Статьи"
            className="h-20 w-20 rounded-xl object-cover transition duration-300 group-hover:brightness-110"
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
