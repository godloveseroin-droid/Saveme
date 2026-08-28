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

export type TeamStatsRow = {
  worker_name: string
  weight: number
  happiness: number
  balance: number
  title_level: number
  title_xp: number
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

export type VoteChoices = { choice_1: string; choice_2: string; choice_3: string }

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

  // Team stats
  getTeamStats: () => apiFetch<TeamStatsRow[]>('/api/team-stats'),
  adjustTeamStats: (worker_name: string, weight: number, happiness: number, balance: number) =>
    apiFetch<TeamStatsRow>('/api/team-stats/adjust', {
      method: 'POST',
      body: JSON.stringify({ worker_name, weight, happiness, balance }),
    }),
  updateTitle: (workerName: string, title_level: number, title_xp: number) =>
    apiFetch<TeamStatsRow>(`/api/team-stats/${encodeURIComponent(workerName)}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title_level, title_xp }),
    }),

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

  // Votes
  getVote: (gameDay: string, voterName: string) =>
    apiFetch<VoteChoices | null>(`/api/votes?gameDay=${encodeURIComponent(gameDay)}&voterName=${encodeURIComponent(voterName)}`),
  submitVote: (game_day: string, voter_name: string, question: string, choices: string[]) =>
    apiFetch<VoteChoices & { game_day: string; voter_name: string; question: string }>('/api/votes', {
      method: 'POST',
      body: JSON.stringify({
        game_day,
        voter_name,
        question,
        choice_1: choices[0],
        choice_2: choices[1],
        choice_3: choices[2],
      }),
    }),
}
