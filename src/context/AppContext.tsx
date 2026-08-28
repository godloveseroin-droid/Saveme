import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Employee, Meme } from '../types'
import { workersList as fallbackWorkers, type Worker } from '../lib/data'
import { api } from '../lib/api'

type AppContextValue = {
  employees: Employee[]
  workers: Worker[]
  memes: Meme[]
  isAdmin: boolean
  loading: boolean
  error: string | null
  unlock: (password: string) => boolean
  lock: () => void
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) => Promise<boolean>
  deleteEmployee: (id: string) => Promise<boolean>
  addWorker: (name: string, gender: Worker['gender']) => Promise<boolean>
  removeWorker: (name: string) => Promise<boolean>
  addMeme: (description: string, imageUrl: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const POLL_INTERVAL = 15000

export function AppProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workers, setWorkers] = useState<Worker[]>(fallbackWorkers)
  const [memes, setMemes] = useState<Meme[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [employeeData, workerData, memeData] = await Promise.all([
        api.getEmployees(),
        api.getWorkers(),
        api.getMemes(),
      ])

      setEmployees(employeeData ?? [])
      setWorkers(workerData?.length ? workerData : fallbackWorkers)
      setMemes(memeData ?? [])
    } catch {
      setError('Не удалось загрузить данные с сервера')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    localStorage.removeItem('employees-v1')
    localStorage.removeItem('memes-v1')
    void refresh()

    const timer = window.setInterval(() => { void refresh() }, POLL_INTERVAL)
    return () => { window.clearInterval(timer) }
  }, [refresh])

  const unlock = (password: string): boolean => {
    if (password !== '3010') return false
    setIsAdmin(true)
    return true
  }

  const lock = (): void => setIsAdmin(false)

  const addEmployee = async (data: Omit<Employee, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      await api.addEmployee(data)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      await api.deleteEmployee(id)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const addWorker = async (name: string, gender: Worker['gender']): Promise<boolean> => {
    try {
      await api.addWorker(name, gender)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const removeWorker = async (name: string): Promise<boolean> => {
    try {
      await api.removeWorker(name)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const addMeme = async (description: string, imageUrl: string): Promise<boolean> => {
    try {
      await api.addMeme(description, imageUrl || null)
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const value = useMemo(
    () => ({ employees, workers, memes, isAdmin, loading, error, unlock, lock, addEmployee, deleteEmployee, addWorker, removeWorker, addMeme, refresh }),
    [employees, workers, memes, isAdmin, loading, error, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider is missing')
  return ctx
}
