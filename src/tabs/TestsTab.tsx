import SwipeBack from '../components/SwipeBack'

type Props = {
  onOpenApplications: () => void
  onOpenArticles: () => void
  onBack: () => void
}

export default function TestsTab({ onOpenApplications, onOpenArticles, onBack }: Props) {
  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-3 pb-10 pt-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>

      <div className="flex gap-2">
        <button
          onClick={onOpenApplications}
          className="group relative flex-1 overflow-hidden rounded-2xl border border-neon/40 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-zayavki.webp"
            alt="Заявки"
            className="block aspect-square w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        </button>

        <button
          onClick={onOpenArticles}
          className="group relative flex-1 overflow-hidden rounded-2xl border border-neon/40 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.96]"
          style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
        >
          <img
            src="/banner-articles.webp"
            alt="Статьи"
            className="block aspect-square w-full object-cover transition duration-300 group-hover:brightness-110"
          />
        </button>
      </div>
    </SwipeBack>
  )
}
