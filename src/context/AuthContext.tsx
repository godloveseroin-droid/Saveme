import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchUserAccounts, getStoredSession, storeSession, clearStoredSession, verifyPin, type UserAccount } from '../lib/auth'

type AuthContextValue = {
  currentUser: { id: string; workerName: string } | null
  userAccounts: UserAccount[]
  loading: boolean
  login: (workerName: string, pin: string) => Promise<boolean>
  switchUser: (workerName: string, pin: string) => Promise<boolean>
  logout: () => void
  refreshAccounts: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{ id: string; workerName: string } | null>(null)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)

  const refreshAccounts = async () => {
    try {
      const accounts = await fetchUserAccounts()
      setUserAccounts(accounts)
    } catch {
      // will retry on next render
    }
  }

  useEffect(() => {
    (async () => {
      await refreshAccounts()
      const stored = getStoredSession()
      if (stored) {
        setCurrentUser({ id: stored.userId, workerName: stored.workerName })
      }
      setLoading(false)
    })()
  }, [])

  const login = async (workerName: string, pin: string): Promise<boolean> => {
    const userId = await verifyPin(workerName, pin)
    if (!userId) return false
    storeSession(userId, workerName)
    setCurrentUser({ id: userId, workerName })
    return true
  }

  const switchUser = async (workerName: string, pin: string): Promise<boolean> => {
    return login(workerName, pin)
  }

  const logout = () => {
    clearStoredSession()
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, userAccounts, loading, login, switchUser, logout, refreshAccounts }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider is missing')
  return ctx
}
