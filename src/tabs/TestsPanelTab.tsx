import { useState, useEffect } from 'react'
import SwipeBack from '../components/SwipeBack'
import { api, type TestQuestionRow } from '../lib/api'

type Props = {
  onBack: () => void
}

export default function TestsPanelTab({ onBack }: Props) {
  const [questions, setQuestions] = useState<TestQuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getActiveTestQuestions()
        if (cancelled) return
        setQuestions(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>

      <h2
        className="mb-4 text-lg font-extrabold tracking-wide text-ink"
        style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}
      >
        Тесты
      </h2>

      {loading ? (
        <div className="py-10 text-center text-sm text-ink/50">Загрузка вопросов...</div>
      ) : error ? (
        <div
          className="rounded-xl border border-error/30 bg-error/10 p-6 text-center"
        >
          <p className="text-sm font-bold text-error">{error}</p>
          <p className="mt-2 text-xs text-ink/50">Проверьте подключение к серверу</p>
        </div>
      ) : questions.length === 0 ? (
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
          <p className="mt-3 text-center text-sm text-ink/60">
            Вопросы ещё не подготовлены. Правильные ответы назначаются через админ-панель.
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-neon/30 bg-card/70 p-8 backdrop-blur-md"
          style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
        >
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-neon/40 bg-neon/10"
            style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}
          >
            <span className="text-2xl font-extrabold text-neon">{questions.length}</span>
          </div>
          <p className="text-center text-sm text-ink/70">
            Доступно вопросов: {questions.length}
          </p>
          <p className="mt-2 text-center text-xs text-ink/50">
            Игра появится после подготовки билетов
          </p>
        </div>
      )}
    </SwipeBack>
  )
}
