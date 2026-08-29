import { useCallback, useEffect, useState } from 'react'
import { Check, Trophy, Gift, Loader as Loader2 } from 'lucide-react'
import { api, type DailyPollState, type DailyPollClaimResult } from '../lib/api'
import { useApp } from '../context/AppContext'

type Props = { onBack: () => void }

const PLACEMENT_ICONS = ['🥇', '🥈', '🥉']

export default function DailyPollGame({ onBack }: Props) {
  const { currentUser } = useApp()
  const [state, setState] = useState<DailyPollState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [voting, setVoting] = useState(false)
  const [voteMsg, setVoteMsg] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<DailyPollClaimResult | null>(null)
  const [resultsClaimed, setResultsClaimed] = useState(false)

  const loadState = useCallback(async () => {
    if (!currentUser) return
    try {
      const data = await api.getDailyPollState(currentUser.id)
      setState(data)
      // If user already voted today, sync selected
      if (data.today.userVote) {
        setSelected(data.today.userVote)
      }
      // Check if yesterday's results already claimed
      if (data.yesterday?.reward?.result_rewarded) {
        setResultsClaimed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { void loadState() }, [loadState])

  const toggleCandidate = (name: string) => {
    if (state?.today.userVote) return // already voted
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name)
      if (prev.length >= 3) return prev
      return [...prev, name]
    })
  }

  const handleVote = async () => {
    if (!currentUser || selected.length === 0) return
    setVoting(true)
    setError('')
    try {
      const result = await api.voteDailyPoll(currentUser.id, selected)
      setVoteMsg(result.message || 'Голос учтён!')
      // Reload state to reflect vote
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка голосования')
    } finally {
      setVoting(false)
    }
  }

  const handleClaimResults = async () => {
    if (!currentUser || resultsClaimed) return
    setClaiming(true)
    setError('')
    try {
      const result = await api.claimDailyPollResults(currentUser.id)
      setClaimResult(result)
      setResultsClaimed(true)
      // Reload state to update profile
      await loadState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка получения награды')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-neon" />
        </div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
          ← Назад
        </button>
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
          <p className="text-sm font-bold text-error">{error}</p>
        </div>
      </div>
    )
  }

  const hasVoted = !!state?.today.userVote
  const yesterday = state?.yesterday

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors">
        ← Назад
      </button>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🔮</span>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">МИНИ-ИГРА 1</p>
          <h1 className="text-xl font-extrabold text-ink">Вопрос дня</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-center">
          <p className="text-xs font-bold text-error">{error}</p>
        </div>
      )}

      {/* ─── Yesterday's results ─── */}
      {yesterday && (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-card/50 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 16px rgba(255,191,0,0.1)' }}>
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-amber-300" />
            <p className="text-[10px] font-bold tracking-widest text-amber-300">ВЧЕРАШНИЙ РЕЗУЛЬТАТ</p>
          </div>
          <p className="mb-3 text-sm font-bold text-ink/90">{yesterday.question}</p>

          <div className="space-y-2">
            {yesterday.results.map((r, i) => {
              const isSelectedByUser = yesterday.userVote?.includes(r.candidate)
              return (
                <div
                  key={r.candidate}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isSelectedByUser
                      ? 'border-amber-400/40 bg-amber-400/10'
                      : 'border-line/50 bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLACEMENT_ICONS[i] || '📦'}</span>
                    <span className="text-sm font-bold text-ink">{r.candidate}</span>
                    {isSelectedByUser && (
                      <Check size={13} className="text-amber-300" />
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-amber-200">{r.votes}</span>
                </div>
              )
            })}
          </div>

          {/* Claim results button */}
          {yesterday.userVote && !resultsClaimed && (
            <button
              onClick={handleClaimResults}
              disabled={claiming}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/15 py-2.5 text-sm font-extrabold text-amber-200 transition hover:bg-amber-400/25 active:scale-95 disabled:opacity-50"
            >
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              Получить награду
            </button>
          )}

          {/* Show claim result */}
          {claimResult && claimResult.totalXp > 0 && (
            <div className="mt-3 rounded-lg border border-neon/30 bg-neon/10 p-3 text-center">
              <p className="text-xs font-bold text-neon">Награда получена!</p>
              <p className="mt-1 text-sm font-extrabold text-neon" style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
                +{claimResult.totalXp} XP
              </p>
              {claimResult.breakdown?.map((b, i) => (
                <p key={i} className="mt-1 text-[10px] text-ink-muted">
                  {PLACEMENT_ICONS[b.placement - 1]} {b.candidate} — +{b.xp} XP
                </p>
              ))}
            </div>
          )}
          {claimResult && claimResult.totalXp === 0 && claimResult.success && (
            <div className="mt-3 rounded-lg border border-line/40 bg-black/20 p-3 text-center">
              <p className="text-xs text-ink-muted">
                {claimResult.message || 'Ваши кандидаты не попали в ТОП-3'}
              </p>
            </div>
          )}
          {resultsClaimed && yesterday.reward && (
            <div className="mt-3 rounded-lg border border-neon/20 bg-neon/5 p-2.5 text-center">
              <p className="text-[11px] font-bold text-neon/70">
                Награда получена: +{yesterday.reward.xp_awarded} XP
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Today's poll ─── */}
      {state && (
        <div className="rounded-2xl border border-neon/30 bg-card/60 p-4 backdrop-blur-md" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.1)' }}>
          <p className="text-[10px] font-bold tracking-widest text-neon">ВОПРОС ДНЯ</p>
          <h2 className="mt-1.5 mb-4 text-base font-extrabold leading-snug text-ink">{state.today.question}</h2>

          <div className="space-y-2.5">
            {state.today.candidates.map((name, i) => {
              const isSelected = selected.includes(name)
              const isVoted = hasVoted
              const wasChosen = state.today.userVote?.includes(name)
              return (
                <button
                  key={name}
                  onClick={() => toggleCandidate(name)}
                  disabled={isVoted}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isVoted
                      ? wasChosen
                        ? 'border-neon/50 bg-neon/15'
                        : 'border-line/30 bg-black/20 opacity-50'
                      : isSelected
                        ? 'border-neon/60 bg-neon/15 active:scale-95'
                        : 'border-line/40 bg-black/20 hover:border-neon/30 active:scale-95'
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold ${
                    isSelected || wasChosen
                      ? 'border-neon bg-neon text-black'
                      : 'border-line/50 text-ink-muted'
                  }`}>
                    {isSelected || wasChosen ? <Check size={15} /> : i + 1}
                  </div>
                  <span className={`text-sm font-bold ${isSelected || wasChosen ? 'text-ink' : 'text-ink/80'}`}>
                    {name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Vote button or confirmation */}
          {hasVoted ? (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Check size={16} className="text-success" />
                <p className="text-sm font-extrabold text-success">Голос учтён!</p>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">Результаты будут доступны завтра в 08:00</p>
              {state.today.userVote && state.today.userVote.length > 0 && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  Вы выбрали: {state.today.userVote.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
                <span className="text-ink-muted">Выбрано: {selected.length} / 3</span>
                {selected.length > 0 && (
                  <button onClick={() => setSelected([])} className="text-neon/60 hover:text-neon">
                    Очистить
                  </button>
                )}
              </div>
              <button
                onClick={handleVote}
                disabled={selected.length === 0 || voting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-3 text-sm font-extrabold text-black transition active:scale-95 disabled:opacity-40"
                style={{ boxShadow: '0 0 16px rgba(0,229,255,0.3)' }}
              >
                {voting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Проголосовать
              </button>
            </>
          )}

          {voteMsg && !hasVoted && (
            <p className="mt-2 text-center text-xs text-success">{voteMsg}</p>
          )}
        </div>
      )}

      {/* Reward info */}
      <div className="mt-3 rounded-xl border border-line/30 bg-black/20 p-3 text-center">
        <p className="text-[10px] font-bold text-ink-muted">
          За участие: +10 XP · За место: +10-30 XP
        </p>
      </div>
    </div>
  )
}
