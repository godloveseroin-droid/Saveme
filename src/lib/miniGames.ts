export const LEVEL_TITLES: Record<number, string> = {
  1: 'Новичок',
  2: 'Ученик',
  3: 'Знаток',
  4: 'Искатель',
  5: 'Опытный',
  6: 'Мастер',
  7: 'Эксперт',
  8: 'Вершитель',
  9: 'Хранитель знаний',
  10: 'Легенда',
}

export const MAX_LEVEL = 10

export function xpForLevel(level: number): number {
  return level * 100
}

export function getTitleForLevel(level: number): string {
  return LEVEL_TITLES[level] || LEVEL_TITLES[MAX_LEVEL]
}

export type LevelInfo = {
  level: number
  currentXp: number
  neededXp: number
  title: string
  progressPercent: number
}

export function getLevelInfo(xp: number): LevelInfo {
  let level = 1
  let remaining = xp
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level)
    if (remaining >= needed) {
      remaining -= needed
      level++
    } else {
      break
    }
  }

  let spent = 0
  for (let l = 1; l < level; l++) {
    spent += xpForLevel(l)
  }
  const currentXp = xp - spent
  const neededXp = level >= MAX_LEVEL ? currentXp : xpForLevel(level)
  const progressPercent = neededXp > 0 ? Math.min(100, (currentXp / neededXp) * 100) : 100

  return {
    level,
    currentXp,
    neededXp,
    title: getTitleForLevel(level),
    progressPercent,
  }
}

export type GameInfo = {
  number: number
  title: string
  icon: string
  description: string
}

export const MINI_GAMES: GameInfo[] = [
  { number: 1, title: 'Вопрос дня', icon: '🔮', description: 'Ежедневный опрос с наградами' },
  { number: 2, title: 'Мини-игра 2', icon: '⚡', description: 'Быстрые ответы на время' },
  { number: 3, title: 'Мини-игра 3', icon: '🌙', description: 'Ночные загадки' },
  { number: 4, title: 'Мини-игра 4', icon: '🔥', description: 'Испытание огнём' },
  { number: 5, title: 'Мини-игра 5', icon: '⭐', description: 'Звёздный путь' },
  { number: 6, title: 'Мини-игра 6', icon: '🎭', description: 'Маски и обманы' },
  { number: 7, title: 'Мини-игра 7', icon: '💫', description: 'Поток сознания' },
  { number: 8, title: 'Мини-игра 8', icon: '🗝️', description: 'Ключи от тайны' },
  { number: 9, title: 'Мини-игра 9', icon: '🌌', description: 'Галактика вопросов' },
  { number: 10, title: 'Мини-игра 10', icon: '👑', description: 'Финальное испытание' },
]
