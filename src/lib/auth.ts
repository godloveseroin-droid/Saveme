import { supabase } from './supabase'

export type UserAccount = {
  id: string
  worker_name: string
}

const SESSION_KEY = 'amalgama-auth-session'

type StoredSession = {
  userId: string
  workerName: string
  savedAt: number
}

export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed || !parsed.userId || !parsed.workerName) return null
    return parsed
  } catch {
    return null
  }
}

export function storeSession(userId: string, workerName: string): void {
  const session: StoredSession = { userId, workerName, savedAt: Date.now() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  const { data, error } = await supabase
    .from('user_accounts')
    .select('id, worker_name')
    .order('worker_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as UserAccount[]
}

export async function verifyPin(workerName: string, pin: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('verify_user_pin', { p_worker_name: workerName, p_pin: pin })
  if (error) throw new Error(error.message)
  return data as string | null
}
