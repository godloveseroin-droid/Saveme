import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import SwipeBack from '../components/SwipeBack'
import { api, type TestQuestionRow } from '../lib/api'
import { Check, X, ChevronLeft, RotateCcw, Award, TriangleAlert as AlertTriangle } from 'lucide-react'

type Props = {
  onBack: () => void
}

type Phase = 'loading' | 'error' | 'intro' | 'playing' | 'finished' | 'review'

type AnswerRecord = {
  questionId: string
  selected: number
  correctAnswer: number
  isCorrect: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TestsPanelTab({ onBack }: Props) {
  const [allQuestions, setAllQuestions] = useState<TestQuestionRow[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // Main test state
  const [mainQueue, setMainQueue] = useState<TestQuestionRow[]>([])
  const [mainIdx, setMainIdx] = useState(0)
  const [mainAnswers, setMainAnswers] = useState<AnswerRecord[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Review state
  const [reviewQueue, setReviewQueue] = useState<TestQuestionRow[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewAnswers, setReviewAnswers] = useState<AnswerRecord[]>([])
  const [reviewSelected, setReviewSelected] = useState<number | null>(null)
  const [reviewRevealed, setReviewRevealed] = useState(false)
  const [reviewStillWrong, setReviewStillWrong] = useState<Set<string>>(new Set())
  const [reviewFixed, setReviewFixed] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPhase('loading')
      setErrorMsg('')
      try {
        const rows = await api.getActiveTestQuestions()
        if (cancelled) return
        setAllQuestions(rows)
        setPhase('intro')
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Ошибка загрузки')
          setPhase('error')
        }
      }
    })()
    return () => {
      cancelled = true
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  // ---- MAIN TEST ----
  const startMainTest = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    const shuffled = shuffle(allQuestions)
    setMainQueue(shuffled)
    setMainIdx(0)
    setMainAnswers([])
    setSelected(null)
    setRevealed(false)
    setPhase('playing')
  }, [allQuestions])

  const selectAnswer = useCallback((optionIdx: number) => {
    if (revealed) return
    const q = mainQueue[mainIdx]
    const isCorrect = optionIdx === q.correct_answer
    setSelected(optionIdx)
    setRevealed(true)
    setMainAnswers(prev => {
      const next = [...prev]
      next[mainIdx] = {
        questionId: q.question_id,
        selected: optionIdx,
        correctAnswer: q.correct_answer,
        isCorrect,
      }
      return next
    })
    advanceTimer.current = setTimeout(() => {
      if (mainIdx + 1 >= mainQueue.length) {
        setPhase('finished')
      } else {
        setMainIdx(i => i + 1)
        setSelected(null)
        setRevealed(false)
      }
    }, 500)
  }, [revealed, mainQueue, mainIdx])

  const goToPrev = useCallback(() => {
    if (mainIdx === 0) return
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setMainIdx(i => i - 1)
    const prevAnswer = mainAnswers[mainIdx - 1]
    if (prevAnswer) {
      setSelected(prevAnswer.selected)
      setRevealed(true)
    } else {
      setSelected(null)
      setRevealed(false)
    }
  }, [mainIdx, mainAnswers])

  const goToNext = useCallback(() => {
    if (mainIdx + 1 >= mainQueue.length) {
      setPhase('finished')
      return
    }
    setMainIdx(i => i + 1)
    const nextAnswer = mainAnswers[mainIdx + 1]
    if (nextAnswer) {
      setSelected(nextAnswer.selected)
      setRevealed(true)
    } else {
      setSelected(null)
      setRevealed(false)
    }
  }, [mainIdx, mainQueue.length, mainAnswers])

  // ---- REVIEW (Работа над ошибками) ----
  const startReview = useCallback(() => {
    const wrongAnswers = mainAnswers.filter(a => !a.isCorrect)
    const wrongQs = wrongAnswers
      .map(a => mainQueue.find(q => q.question_id === a.questionId))
      .filter((q): q is TestQuestionRow => q !== undefined)
    if (wrongQs.length === 0) return
    setReviewQueue(wrongQs)
    setReviewIdx(0)
    setReviewAnswers([])
    setReviewSelected(null)
    setReviewRevealed(false)
    setReviewStillWrong(new Set())
    setReviewFixed(0)
    setPhase('review')
  }, [mainAnswers, mainQueue])

  const selectReviewAnswer = useCallback((optionIdx: number) => {
    if (reviewRevealed) return
    const q = reviewQueue[reviewIdx]
    const isCorrect = optionIdx === q.correct_answer
    setReviewSelected(optionIdx)
    setReviewRevealed(true)
    setReviewAnswers(prev => {
      const next = [...prev]
      next[reviewIdx] = {
        questionId: q.question_id,
        selected: optionIdx,
        correctAnswer: q.correct_answer,
        isCorrect,
      }
      return next
    })
    if (isCorrect) {
      setReviewFixed(f => f + 1)
    } else {
      setReviewStillWrong(prev => new Set(prev).add(q.question_id))
    }
    advanceTimer.current = setTimeout(() => {
      if (reviewIdx + 1 >= reviewQueue.length) {
        setPhase('finished')
      } else {
        setReviewIdx(i => i + 1)
        setReviewSelected(null)
        setReviewRevealed(false)
      }
    }, 500)
  }, [reviewRevealed, reviewQueue, reviewIdx])

  const goToPrevReview = useCallback(() => {
    if (reviewIdx === 0) return
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    setReviewIdx(i => i - 1)
    const prevAnswer = reviewAnswers[reviewIdx - 1]
    if (prevAnswer) {
      setReviewSelected(prevAnswer.selected)
      setReviewRevealed(true)
    } else {
      setReviewSelected(null)
      setReviewRevealed(false)
    }
  }, [reviewIdx, reviewAnswers])

  // ---- COMPUTED VALUES ----
  const totalQuestions = allQuestions.length

  // ---- LOADING / ERROR ----
  if (phase === 'loading' || phase === 'error') {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <h2 className="mb-4 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>
          Тесты
        </h2>
        {phase === 'loading' ? (
          <div className="py-10 text-center text-sm text-ink/50">Загрузка вопросов...</div>
        ) : (
          <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
            <p className="text-sm font-bold text-error">{errorMsg}</p>
            <p className="mt-2 text-xs text-ink/50">Проверьте подключение к серверу</p>
          </div>
        )}
      </SwipeBack>
    )
  }

  // ---- INTRO ----
  if (phase === 'intro') {
    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <h2 className="mb-6 text-lg font-extrabold tracking-wide text-ink" style={{ textShadow: '0 0 8px rgba(0,229,255,0.25)' }}>
          Тесты
        </h2>

        {totalQuestions === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-neon/30 bg-card/70 p-10 backdrop-blur-md animate-scaleIn"
            style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}>
              <span className="text-2xl font-extrabold text-neon">?</span>
            </div>
            <p className="mt-3 text-center text-sm text-ink/60">
              Вопросы ещё не подготовлены. Правильные ответы назначаются через админ-панель.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-8 backdrop-blur-md animate-scaleIn"
            style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 16px rgba(0,229,255,0.25)' }}>
              <span className="text-3xl font-extrabold text-neon">{totalQuestions}</span>
            </div>
            <p className="text-center text-base font-bold text-ink">Доступно вопросов: {totalQuestions}</p>
            <p className="mt-2 text-center text-xs text-ink/50">Вопросы идут в случайном порядке. Правильный ответ откроется после вашего выбора.</p>
            <button
              onClick={startMainTest}
              className="mt-6 w-full rounded-xl border border-neon/50 bg-neon/15 px-6 py-3 font-extrabold text-neon transition hover:bg-neon/25 active:scale-[0.97]"
            >
              Начать тест
            </button>
          </div>
        )}
      </SwipeBack>
    )
  }

  // ---- FINISHED (stats + review button) ----
  if (phase === 'finished') {
    const isReviewComplete = reviewQueue.length > 0 && reviewAnswers.length >= reviewQueue.length
    const correct = isReviewComplete ? reviewAnswers.filter(a => a.isCorrect).length + (mainAnswers.filter(a => a.isCorrect).length - reviewQueue.length + reviewQueue.length - reviewStillWrong.size) : mainAnswers.filter(a => a.isCorrect).length
    const wrong = mainAnswers.length - correct
    const percentage = mainAnswers.length > 0 ? Math.round((correct / mainAnswers.length) * 100) : 0

    if (isReviewComplete) {
      const stillWrongCount = reviewStillWrong.size
      const fixedCount = reviewQueue.length - stillWrongCount
      return (
        <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
          <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
          <div className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-6 backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}>
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.25)' }}>
              <Award size={32} color="#00e5ff" />
            </div>
            <h2 className="text-lg font-extrabold text-ink">Работа над ошибками завершена</h2>
            <div className="mt-5 grid w-full grid-cols-2 gap-3">
              <div className="flex flex-col items-center rounded-xl border border-success/30 bg-success/10 p-3">
                <span className="text-2xl font-extrabold text-success">{fixedCount}</span>
                <span className="mt-0.5 text-xs text-ink/50">Исправлено</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-error/30 bg-error/10 p-3">
                <span className="text-2xl font-extrabold text-error">{stillWrongCount}</span>
                <span className="mt-0.5 text-xs text-ink/50">Осталось</span>
              </div>
            </div>
            <div className="mt-4 w-full">
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
                <div className="h-full rounded-full bg-neon transition-all duration-700" style={{ width: `${mainAnswers.length > 0 ? Math.round(((mainAnswers.length - stillWrongCount) / mainAnswers.length) * 100) : 100}%`, boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
              </div>
            </div>
            <div className="mt-5 flex w-full gap-3">
              <button onClick={() => { setReviewQueue([]); setMainQueue([]); setMainAnswers([]); startMainTest() }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-bold text-neon transition hover:bg-neon/25 active:scale-[0.97]">
                <RotateCcw size={18} /> Заново
              </button>
              <button onClick={onBack} className="flex-1 rounded-xl border border-neon/30 bg-card/60 px-4 py-3 font-bold text-ink/70 transition hover:bg-card/80 active:scale-[0.97]">Назад</button>
            </div>
          </div>
        </SwipeBack>
      )
    }

    const wrongInMain = mainAnswers.filter(a => !a.isCorrect).length

    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-4">
        <button onClick={onBack} className="mb-4 text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
        <div className="flex flex-col items-center rounded-2xl border border-neon/30 bg-card/70 p-6 backdrop-blur-md animate-scaleIn" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.12)' }}>
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.25)' }}>
            <Award size={32} color="#00e5ff" />
          </div>
          <h2 className="text-lg font-extrabold text-ink">Тест завершён</h2>
          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-xl border border-success/30 bg-success/10 p-3">
              <span className="text-2xl font-extrabold text-success">{correct}</span>
              <span className="mt-0.5 text-xs text-ink/50">Правильных</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-error/30 bg-error/10 p-3">
              <span className="text-2xl font-extrabold text-error">{wrong}</span>
              <span className="mt-0.5 text-xs text-ink/50">Ошибок</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/70">Процент правильных ответов: <span className="font-extrabold text-neon">{percentage}%</span></p>
          <div className="mt-3 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg/60">
              <div className="h-full rounded-full bg-neon transition-all duration-700" style={{ width: `${percentage}%`, boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
            </div>
          </div>

          {wrongInMain > 0 ? (
            <button
              onClick={startReview}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-error/50 bg-error/15 px-4 py-4 font-extrabold text-error transition hover:bg-error/25 active:scale-[0.97]"
            >
              <AlertTriangle size={20} /> РАБОТА НАД ОШИБКАМИ ({wrongInMain})
            </button>
          ) : (
            <div className="mt-5 w-full rounded-xl border border-success/30 bg-success/10 px-4 py-4 text-center">
              <p className="text-sm font-bold text-success">Ошибок нет — работа над ошибками не требуется</p>
            </div>
          )}

          <div className="mt-3 flex w-full gap-3">
            <button onClick={startMainTest} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 px-4 py-3 font-bold text-neon transition hover:bg-neon/25 active:scale-[0.97]">
              <RotateCcw size={18} /> Заново
            </button>
            <button onClick={onBack} className="flex-1 rounded-xl border border-neon/30 bg-card/60 px-4 py-3 font-bold text-ink/70 transition hover:bg-card/80 active:scale-[0.97]">Назад</button>
          </div>
        </div>
      </SwipeBack>
    )
  }

  // ---- REVIEW MODE ----
  if (phase === 'review') {
    const q = reviewQueue[reviewIdx]
    if (!q) return null
    const isCorrect = reviewRevealed && reviewSelected === q.correct_answer
    const isWrong = reviewRevealed && reviewSelected !== q.correct_answer
    const progress = { current: reviewIdx + 1, total: reviewQueue.length }

    return (
      <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={onBack} className="text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
          <span className="text-xs font-bold text-neon">Работа над ошибками</span>
        </div>
        <div className="mb-1 flex items-center justify-between text-xs font-bold">
          <span className="text-neon">{progress.current} / {progress.total}</span>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-bg/60">
          <div className="h-full rounded-full bg-error transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%`, boxShadow: '0 0 6px rgba(255,68,68,0.5)' }} />
        </div>

        <div key={q.question_id + '-rev'} className="animate-slideUp rounded-xl border border-neon/20 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 10px rgba(0,229,255,0.06)' }}>
          <span className="mb-2 block text-xs font-extrabold text-neon/70">{q.question_id}</span>
          <p className="mb-3 text-sm leading-relaxed text-ink/90">{q.question_text}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              const isSelected = reviewSelected === i
              const isRight = reviewRevealed && i === q.correct_answer
              const isWrongSel = reviewRevealed && isSelected && i !== q.correct_answer
              let cls = 'border-neon/15 bg-bg/40 text-ink/70'
              if (isRight) cls = 'border-success/60 bg-success/15 text-ink'
              else if (isWrongSel) cls = 'border-error/60 bg-error/15 text-ink animate-shakeHit'
              else if (reviewRevealed) cls = 'border-neon/10 bg-bg/30 text-ink/40'
              return (
                <button
                  key={i}
                  onClick={() => selectReviewAnswer(i)}
                  disabled={reviewRevealed}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${cls} ${!reviewRevealed ? 'active:scale-[0.98]' : ''}`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isRight ? 'border-success bg-success text-bg' : isWrongSel ? 'border-error bg-error text-bg' : 'border-neon/40'}`}>
                    {isRight ? <Check size={12} /> : isWrongSel ? <X size={12} /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Feedback line */}
        <div className="mt-2 min-h-[28px] flex items-center">
          {isCorrect && <span className="flex items-center gap-1 text-sm font-bold text-success"><Check size={14} /> Верно!</span>}
          {isWrong && <span className="flex items-center gap-1 text-sm font-bold text-error"><X size={14} /> Неправильный ответ</span>}
        </div>

        {/* Previous button */}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={goToPrevReview}
            disabled={reviewIdx === 0}
            className="flex items-center gap-1 rounded-lg border border-neon/20 bg-card/50 px-3 py-2 text-xs font-bold text-neon transition enabled:hover:bg-neon/10 disabled:opacity-30 active:scale-[0.97]"
          >
            <ChevronLeft size={16} /> Предыдущий
          </button>
          <span className="text-xs text-ink/40">Исправлено: {reviewFixed} · Осталось: {reviewStillWrong.size}</span>
        </div>
      </SwipeBack>
    )
  }

  // ---- PLAYING (main test) ----
  const q = mainQueue[mainIdx]
  if (!q) return null
  const isCorrect = revealed && selected === q.correct_answer
  const isWrong = revealed && selected !== null && selected !== q.correct_answer
  const progress = { current: mainIdx + 1, total: mainQueue.length }

  return (
    <SwipeBack onBack={onBack} innerClassName="mx-auto max-w-md px-4 pb-10 pt-3">
      {/* Top: back + progress */}
      <div className="mb-2 flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-bold text-neon hover:text-white transition-colors">← Назад</button>
      </div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span className="text-neon">{progress.current} / {progress.total}</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-bg/60">
        <div className="h-full rounded-full bg-neon transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%`, boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
      </div>

      {/* Question card — compact */}
      <div key={q.question_id} className="animate-slideUp rounded-xl border border-neon/20 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 10px rgba(0,229,255,0.06)' }}>
        <span className="mb-2 block text-xs font-extrabold text-neon/70">{q.question_id}</span>
        <p className="mb-3 text-sm leading-relaxed text-ink/90">{q.question_text}</p>

        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const isSelected = selected === i
            const isRight = revealed && i === q.correct_answer
            const isWrongSel = revealed && isSelected && i !== q.correct_answer
            let cls = 'border-neon/15 bg-bg/40 text-ink/70'
            if (isRight) cls = 'border-success/60 bg-success/15 text-ink'
            else if (isWrongSel) cls = 'border-error/60 bg-error/15 text-ink animate-shakeHit'
            else if (revealed) cls = 'border-neon/10 bg-bg/30 text-ink/40'
            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                disabled={revealed}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${cls} ${!revealed ? 'active:scale-[0.98]' : ''}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isRight ? 'border-success bg-success text-bg' : isWrongSel ? 'border-error bg-error text-bg' : 'border-neon/40'}`}>
                  {isRight ? <Check size={12} /> : isWrongSel ? <X size={12} /> : String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback line — minimal */}
      <div className="mt-2 min-h-[28px] flex items-center">
        {isCorrect && <span className="flex items-center gap-1 text-sm font-bold text-success animate-fadeIn"><Check size={14} /> Верно!</span>}
        {isWrong && <span className="flex items-center gap-1 text-sm font-bold text-error animate-fadeIn"><X size={14} /> Неправильный ответ</span>}
      </div>

      {/* Bottom: previous button */}
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={goToPrev}
          disabled={mainIdx === 0}
          className="flex items-center gap-1 rounded-lg border border-neon/20 bg-card/50 px-3 py-2 text-xs font-bold text-neon transition enabled:hover:bg-neon/10 disabled:opacity-30 active:scale-[0.97]"
        >
          <ChevronLeft size={16} /> Предыдущий вопрос
        </button>
        {mainIdx + 1 < mainQueue.length && revealed && (
          <button
            onClick={goToNext}
            className="flex items-center gap-1 rounded-lg border border-neon/30 bg-neon/10 px-3 py-2 text-xs font-bold text-neon transition hover:bg-neon/20 active:scale-[0.97]"
          >
            Далее →
          </button>
        )}
      </div>
    </SwipeBack>
  )
}
