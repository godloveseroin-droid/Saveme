import { useState } from 'react'
import { UserCog, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LoginScreen from './LoginScreen'

type Props = {
  onSwitched: () => void
  onClose: () => void
}

export default function UserSwitcher({ onSwitched, onClose }: Props) {
  const { currentUser } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  if (showLogin) {
    return (
      <LoginScreen
        title="Сменить пользователя"
        subtitle="Выберите другое ФИО и введите пароль"
        excludeName={currentUser?.workerName}
        onSuccess={() => { onSwitched() }}
        onCancel={() => setShowLogin(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-neon/30 bg-black/90 p-6 animate-scaleIn"
        style={{ boxShadow: '0 0 24px rgba(0,229,255,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog size={20} color="#00e5ff" />
            <h2 className="text-base font-extrabold text-ink">Сменить пользователя</h2>
          </div>
          <button onClick={onClose} className="text-ink/40 transition hover:text-ink/70">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-neon/20 bg-neon/5 px-4 py-3">
          <p className="text-xs text-ink/50">Текущий пользователь:</p>
          <p className="mt-0.5 text-sm font-bold text-neon">{currentUser?.workerName}</p>
        </div>

        <button
          onClick={() => setShowLogin(true)}
          className="w-full rounded-xl border border-neon/50 bg-neon/15 py-3 font-extrabold text-neon transition hover:bg-neon/25 active:scale-[0.97]"
        >
          Выбрать другого сотрудника
        </button>
      </div>
    </div>
  )
}
