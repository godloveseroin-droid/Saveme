import { useState, useMemo } from 'react'
import { ChevronDown, Lock, Loader as Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type Props = {
  onSuccess: () => void
  onCancel?: () => void
  title?: string
  subtitle?: string
  excludeName?: string
}

export default function LoginScreen({ onSuccess, onCancel, title, subtitle, excludeName }: Props) {
  const { userAccounts, login, refreshAccounts } = useAuth()
  const [selectedName, setSelectedName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const filteredAccounts = useMemo(
    () => excludeName ? userAccounts.filter(a => a.worker_name !== excludeName) : userAccounts,
    [userAccounts, excludeName]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedName) { setError('Выберите ФИО'); return }
    if (pin.length !== 5) { setError('Пароль должен содержать 5 цифр'); return }
    setError('')
    setLoading(true)
    try {
      const ok = await login(selectedName, pin)
      if (ok) {
        setPin('')
        onSuccess()
      } else {
        setError('Неверный пароль')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const greeting = title || 'Добро пожаловать в Амальгаму!'
  const sub = subtitle || 'Выберите своё ФИО и введите пароль'

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center animate-fadeIn">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10" style={{ boxShadow: '0 0 24px rgba(0,229,255,0.2)' }}>
            <Lock size={28} color="#00e5ff" />
          </div>
          <h1 className="text-xl font-extrabold text-ink" style={{ textShadow: '0 0 12px rgba(0,229,255,0.3)' }}>{greeting}</h1>
          <p className="mt-2 text-sm text-ink/50">{sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-slideUp">
          <div className="relative">
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-neon/70">ВАШЕ ФИО</label>
            <button
              type="button"
              onClick={() => { setDropdownOpen(o => !o); refreshAccounts() }}
              className="flex w-full items-center justify-between rounded-xl border border-neon/30 bg-black/50 px-4 py-3 text-left text-sm font-bold text-ink backdrop-blur-md transition hover:border-neon/50"
            >
              <span className={selectedName ? 'text-ink' : 'text-ink/40'}>
                {selectedName || 'Выберите из списка...'}
              </span>
              <ChevronDown size={18} className={`text-neon/60 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-neon/30 bg-black/90 backdrop-blur-md" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                {filteredAccounts.length === 0 && (
                  <div className="px-4 py-3 text-xs text-ink/40">Загрузка списка...</div>
                )}
                {filteredAccounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => { setSelectedName(acc.worker_name); setDropdownOpen(false); setError('') }}
                    className="block w-full px-4 py-2.5 text-left text-sm font-bold text-ink/80 transition hover:bg-neon/10 hover:text-neon"
                  >
                    {acc.worker_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-wider text-neon/70">ПАРОЛЬ (5 ЦИФР)</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 5)); setError('') }}
              placeholder="• • • • •"
              className="w-full rounded-xl border border-neon/30 bg-black/50 px-4 py-3 text-center text-lg font-bold tracking-[0.5em] text-ink backdrop-blur-md transition focus:border-neon/60 focus:outline-none"
              style={{ boxShadow: '0 0 0 1px transparent' }}
              autoFocus={!!selectedName}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-center text-xs font-bold text-error animate-fadeIn">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedName || pin.length !== 5}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neon/50 bg-neon/15 py-3.5 font-extrabold text-neon backdrop-blur-md transition hover:bg-neon/25 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
            style={{ boxShadow: '0 0 16px rgba(0,229,255,0.15)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Проверка...' : 'Войти'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-center text-xs font-bold text-ink/40 transition hover:text-ink/70"
            >
              Отмена
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
