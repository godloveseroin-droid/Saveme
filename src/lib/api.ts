const API_BASE = 'https://api.serointeam.ru'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type Worker = { name: string; gender: 'м' | 'ж' }

export type Employee = {
  id: string
  full_name: string
  organization: string
  access_date: string
  record_type: 'person' | 'vehicle'
  vehicle_type: string | null
  created_at?: string
}

export type Meme = {
  id: string
  description: string
  image_url: string | null
  created_at?: string
}

export type ChatMessage = {
  id: string
  user_id: string
  nickname: string
  message: string
  chat_day: string
  created_at: string
}

export type PredictionCount = { name: string; count: number }

export const api = {
  // Employees
  getEmployees: () => apiFetch<Employee[]>('/api/employees'),
  addEmployee: (data: Omit<Employee, 'id' | 'created_at'>) =>
    apiFetch<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    apiFetch<void>(`/api/employees/${id}`, { method: 'DELETE' }),

  // Workers
  getWorkers: () => apiFetch<Worker[]>('/api/workers'),
  addWorker: (name: string, gender: string) =>
    apiFetch<Worker>('/api/workers', { method: 'POST', body: JSON.stringify({ name, gender }) }),
  removeWorker: (name: string) =>
    apiFetch<void>(`/api/workers/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  // Memes
  getMemes: () => apiFetch<Meme[]>('/api/memes'),
  addMeme: (description: string, image_url: string | null) =>
    apiFetch<Meme>('/api/memes', { method: 'POST', body: JSON.stringify({ description, image_url }) }),

  // Prediction counts
  getPredictionCounts: () => apiFetch<PredictionCount[]>('/api/prediction-counts'),
  incrementPredictionCount: (name: string) =>
    apiFetch<PredictionCount>('/api/prediction-counts/increment', { method: 'POST', body: JSON.stringify({ name }) }),

  // Secret attempts
  getSecretAttempts: () => apiFetch<{ attempts: number }>('/api/secret-attempts'),
  incrementSecretAttempts: () =>
    apiFetch<{ attempts: number }>('/api/secret-attempts/increment', { method: 'POST' }),

  // Chat
  getMyNick: (deviceId: string, day: string) =>
    apiFetch<{ nickname: string | null }>(`/api/chat/nicks/${deviceId}?day=${day}`),
  getTakenNicks: (day: string) =>
    apiFetch<string[]>(`/api/chat/nicks?day=${day}`),
  assignNick: (user_id: string, nickname: string, chat_day: string) =>
    apiFetch<{ user_id: string; nickname: string; chat_day: string }>('/api/chat/nicks', {
      method: 'POST',
      body: JSON.stringify({ user_id, nickname, chat_day }),
    }),
  getMessages: (day: string) =>
    apiFetch<ChatMessage[]>(`/api/chat/messages?day=${day}`),
  sendMessage: (user_id: string, nickname: string, message: string, chat_day: string) =>
    apiFetch<ChatMessage>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ user_id, nickname, message, chat_day }),
    }),
  getMessageCount: (day: string) =>
    apiFetch<{ count: number }>(`/api/chat/messages/count?day=${day}`),
}
