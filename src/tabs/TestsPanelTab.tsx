import { useState, useEffect, useMemo, useCallback } from 'react'
import SwipeBack from '../components/SwipeBack'
import { api, type TestQuestionRow } from '../lib/api'
import { Check, X, ChevronRight, RotateCcw, Award } from 'lucide-react'

type Props = {
  onBack: () => void
}

type Phase = 'loading' | 'error' | 'intro' | 'playing' | 'finished'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TestsPanelTab({ onBack }: Props) {
  const [questions, setQuestions] = useState<TestQuestionRow[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const [shuffled, setShuffled] = useState<TestQuestionRow[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<{ qid: string; correct: boolean }[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPhase('loading')
      setErrorMsg('')
      try {
        const rows = await api.getActiveTestQuestions()
        if (cancelled) return
        setQuestions(rows)
        setPhase(rows.length === 0 ? 'intro' : 'intro')
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Ошибка загрузки')
          setPhase('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const startTest = useCallback(() => {
    setShuffled(shuffle(questions))
    setCurrentIdx(0)
    setSelected(null)
    setRevealed(false)
    setScore(0)
    setAnswers([])
    setPhase('playing')
  }, [questions])

  const handleSelect = useCallback((optionIdx: number) => {
    if (revealed) return
    setSelected(optionIdx)
    setRevealed(true)
    const q = shuffled[currentIdx]
    const isCorrect = optionIdx === q.correct_answer
    if (isCorrect) setScore(s => s + 1)
    setAnswers(prev => [...prev, { qid: q.question_id, correct: isCorrect }])
  }, [revealed, shuffled, currentIdx])

  const nextQuestion = useCallback(() => {
    if (currentIdx + 1 >= shuffled.length) {
      setPhase('finished')
    } else {
      setCurrentIdx(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }, [currentIdx, shuffled.length])

  const restart = useCallback(() => {
    setShuffled(shuffle(questions))
    setCurrentIdx(0)
    setSelected(null)
    setRevealed(false)
    setScore(0)
    setAnswers([])
    setPhase('playing')
  }, [questions])

  const progress = useMemo(() => {
    if (phase === 'playing' && shuffled.length > 0) {
      return { current: currentIdx + 1, total: shuffled.length }
    }
    return { current: 0, total: questions.length }
  }, [phase, shuffled.length, currentIdx, questions.length])

  // ---- INTRO SCREEN ----
  if (phase === 'loading') {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <h2 className="mb-4 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>
          Тесты
        </h2>
        <div className="py-10 text-center text-sm text-ink/50">Загрузка вопросов...</div>
      </SwipeBack>
    )
  }

  if (phase === 'error') {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <h2 className="mb-4 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>
          Тесты
        </h2>
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
          <p className="text-sm font-bold text-error">{errorMsg}</p>
          <p className="mt-2 text-xs text-ink/50">Проверьте подключение к серверу</p>
        </div>
      </SwipeBack>
    )
  }

  if (phase === 'intro') {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <h2 className="mb-6 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>
          Тесты
        </h2>

        {questions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-neon/30 bg-card/70 p-10 backdrop-blur-md animate-scaleIn"
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
            className="flex flex-col items-center justify-center rounded-2xl border border-neon/30 bg-card/70 p-8 backdrop-blur-md animate-scaleIn"
            style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
          >
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10"
              style={{ boxShadow: '0 0 16px rgba(0,229,255,0.25)' }}
            >
              <span className="text-3xl font-extrabold text-neon">{questions.length}</span>
            </div>
            <p className="text-center text-base font-bold text-ink">
              Доступно вопросов: {questions.length}
            </p>
            <p className="mt-2 text-center text-xs text-ink/50">
              Вопросы идут в случайном порядке. Правильный ответ откроется после вашего выбора.
            </p>
            <button
              onClick={startTest}
              className="mt-6 w-full rounded-xl border border-neon/50 bg-neon/15 px-6 py-3 font-extrabold text-neon transition hover:bg-neon/25 active:scale-[0.97]"
            >
              Начать тест
            </button>
          </div>
        )}
      </SwipeBack>
    )
  }

  if (phase === 'finished') {
    const total = shuffled.length
    const correct = score
    const wrong = total - correct
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>

        <div
          className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-8 backdrop-blur-md animate-scaleIn"
          style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}
        >
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10"
            style={{ boxShadow: '0 0 16px rgba(0,229,255,0.25)' }}
          >
            <Award size={36} color="#00e5ff" />
          </div>
          <h2 className="text-lg font-extrabold text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>
            Тест завершён
          </h2>

          <div className="mt-6 grid w-full grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-xl border border-success/30 bg-success/10 p-3">
              <span className="text-2xl font-extrabold text-success">{correct}</span>
              <span className="mt-1 text-xs text-ink/50">Правильно</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-error/30 bg-error/10 p-3">
              <span className="text-2xl font-extrabold text-error">{wrong}</span>
              <span className="mt-1 text-xs text-ink/50">Ошибок</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-neon/30 bg-neon/10 p-3">
              <span className="text-2xl font-extrabold text-neon">{percentage}%</span>
              <span className="mt-1 text-xs text-ink/50">Результат</span>
            </div>
          </div>

          <div className="mt-3 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
              <div
                className="h-full rounded-full bg-neon transition-all duration-700"
                style={{ width: `${percentage}%`, boxShadow: '0 0 8px rgba(0,229,255,0.5)' }}
              />
            </div>
          </div>

          <div className="mt-6 flex w-full gap-3">
            <button
              onClick={restart}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-bold text-neon transition hover:bg-neon/25 active:scale-[0.97]"
            >
              <RotateCcw size={18} />
              Заново
            </button>
            <button
              onClick={onBack}
              className="flex-1 rounded-xl border border-neon/30 bg-card/60 px-4 py-3 font-bold text-ink/70 transition hover:bg-card/80 active:scale-[0.97]"
            >
              Назад
            </button>
          </div>
        </div>
      </SwipeBack>
    )
  }

  // ---- PLAYING ----
  const q = shuffled[currentIdx]
  if (!q) return null
  const isCorrect = revealed && selected === q.correct_answer

  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-10">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
        ← Назад
      </button>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-neon">{progress.current} / {progress.total}</span>
          <span className="text-ink/50">Очки: {score}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
          <div
            className="h-full rounded-full bg-neon transition-all duration-500"
            style={{
              width: `${(progress.current / progress.total) * 100}%`,
              boxShadow: '0 0 8px rgba(0,229,255,0.5)',
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        key={q.question_id}
        className="animate-slideUp rounded-2xl border border-neon/20 bg-card/60 p-5 backdrop-blur-md"
        style={{ boxShadow: '0 0 14px rgba(0,229,255,0.08)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="font-extrabold text-neon">{q.question_id}</span>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-ink/90">{q.question_text}</p>

        <div className="flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selected === i
            const isRightAnswer = revealed && i === q.correct_answer
            const isWrongSelection = revealed && isSelected && i !== q.correct_answer

            let cls = 'border-neon/15 bg-bg/40 text-ink/70 hover:border-neon/30'
            if (isRightAnswer) {
              cls = 'border-success/60 bg-success/15 text-ink'
            } else if (isWrongSelection) {
              cls = 'border-error/60 bg-error/15 text-ink animate-shakeHit'
            } else if (revealed) {
              cls = 'border-neon/10 bg-bg/30 text-ink/40'
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${cls} ${!revealed ? 'active:scale-[0.98]' : ''}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  isRightAnswer ? 'border-success bg-success text-bg' :
                  isWrongSelection ? 'border-error bg-error text-bg' :
                  'border-neon/40'
                }`}>
                  {isRightAnswer ? <Check size={12} /> :
                   isWrongSelection ? <X size={12} /> :
                   String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
        </div>

        {/* Result feedback */}
        {revealed && (
          <div className="mt-4 animate-fadeIn">
            {isCorrect ? (
              <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3">
                <Check size={18} color="#22c55e" />
                <span className="text-sm font-bold text-success">Верно!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 px-4 py-3">
                <X size={18} color="#ff4444" />
                <span className="text-sm font-bold text-error">Неправильный ответ</span>
              </div>
            )}

            <button
              onClick={nextQuestion}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-extrabold text-neon transition hover:bg-neon/25 active:scale-[0.97]"
            >
              {currentIdx + 1 >= shuffled.length ? 'Завершить тест' : 'Следующий вопрос'}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </SwipeBack>
  )
}
