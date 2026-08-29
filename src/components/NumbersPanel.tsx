import { useEffect, useState, useCallback } from 'react'
import { Lock, Save, ArrowLeft, Check } from 'lucide-react'
import { api, type KnowledgeNumber } from '../lib/api'

type Props = { onBack: () => void }

export default function NumbersPanel({ onBack }: Props) {
  const [numbers, setNumbers] = useState<KnowledgeNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const loadNumbers = useCallback(async () => {
    try {
      const data = await api.getKnowledgeNumbers()
      setNumbers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadNumbers() }, [loadNumbers])

  const current = numbers.find((n) => n.number === selected)

  const openNumber = (n: number) => {
    const item = numbers.find((it) => it.number === n)
    if (item) setEditText(item.content)
    setSelected(n)
  }

  const handleAdminLogin = () => {
    if (adminPassword === '3010') {
      setIsAdmin(true)
      setAdminOpen(false)
      setAdminPassword('')
      setAdminError('')
    } else {
      setAdminError('Неверный пароль')
    }
  }

  const handleSave = async () => {
    if (selected === null) return
    setSaving(true)
    setSavedFlash(false)
    try {
      const updated = await api.updateKnowledgeNumber(selected, editText, '3010')
      setNumbers((prev) => prev.map((n) => (n.number === selected ? updated : n)))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  // -- Number detail view --
  if (selected !== null) {
    return (
      <div className="mx-auto max-w-md px-5 pb-10 pt-6">
        <button
          onClick={() => setSelected(null)}
          className="mb-5 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Назад к числам
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-widest text-neon">ЧИСЛА</p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">{selected} число</h1>
        </div>

        <div className="rounded-2xl border border-neon/25 bg-card/70 backdrop-blur-md p-5" style={{ boxShadow: '0 0 18px rgba(0,229,255,0.08)' }}>
          {isAdmin ? (
            <>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Введите текст для этого числа..."
                className="min-h-[240px] w-full resize-y rounded-xl border border-line bg-input px-4 py-3 text-sm leading-relaxed text-ink outline-none focus:border-neon/50"
              />
              <div className="mt-3 flex items-center justify-between">
                {savedFlash ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-success">
                    <Check size={16} /> Сохранено
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted">
                    {saving ? 'Сохранение...' : 'Режим редактирования'}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl border border-neon/40 bg-neon/15 px-5 py-2.5 text-sm font-extrabold text-neon transition hover:bg-neon/25 active:scale-95 disabled:opacity-50"
                >
                  <Save size={16} /> Сохранить
                </button>
              </div>
            </>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap break-words text-[15px] leading-[1.8] text-ink/90">
              {current?.content?.trim() ? (
                current.content.split('\n').map((para, i) => (
                  <p key={i} className="mb-3">{para}</p>
                ))
              ) : (
                <p className="text-ink-muted">Текст для этого числа ещё не добавлен.</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // -- Grid of 31 numbers --
  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm font-bold text-neon hover:text-white transition-colors"
      >
        ← Назад
      </button>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-neon">ЗНАНИЯ / ЧИСЛА</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">Числа</h1>
        </div>
        <button
          onClick={() => { if (isAdmin) setIsAdmin(false); else setAdminOpen(true) }}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-transform active:scale-90 ${
            isAdmin ? 'border-success/50 bg-success/10' : 'border-line bg-card/70'
          }`}
          title={isAdmin ? 'Выйти из админа' : 'Администратор'}
        >
          <Lock size={17} color={isAdmin ? '#22ff88' : '#8b92a3'} />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-ink-muted">Загрузка...</div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center">
          <p className="text-sm font-bold text-error">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {numbers.map((n) => (
            <button
              key={n.number}
              onClick={() => openNumber(n.number)}
              className="flex flex-col items-center justify-center rounded-xl border border-neon/25 bg-card/60 py-5 text-center backdrop-blur-md transition-all hover:border-neon/50 hover:bg-neon/8 active:scale-95"
              style={{ boxShadow: '0 0 10px rgba(0,229,255,0.06)' }}
            >
              <span className="text-lg font-extrabold text-neon" style={{ textShadow: '0 0 8px rgba(0,229,255,0.3)' }}>
                {n.number} число
              </span>
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <p className="mt-4 text-center text-xs font-bold text-success">
          Режим администратора активен
        </p>
      )}

      {/* Admin login modal */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" onClick={() => setAdminOpen(false)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-neon/30 bg-card/95 p-6 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setAdminOpen(false)} className="absolute right-4 top-4 text-ink-muted hover:text-ink">✕</button>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}>
                <Lock size={24} color="#00e5ff" />
              </div>
            </div>
            <h2 className="mb-4 text-center text-lg font-extrabold text-ink">Администратор</h2>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAdminError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Пароль"
              inputMode="numeric"
              autoFocus
              className="h-12 w-full rounded-xl border border-line bg-input px-4 text-lg tracking-widest text-ink outline-none focus:border-neon/50"
            />
            {adminError && <p className="mt-2 text-xs text-error">{adminError}</p>}
            <button
              onClick={handleAdminLogin}
              className="mt-4 h-12 w-full rounded-xl bg-neon text-sm font-extrabold text-black transition active:scale-95"
            >
              ВОЙТИ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
