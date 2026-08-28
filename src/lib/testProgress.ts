import type { TestQuestionRow } from './api'

export type AnswerRecord = {
  questionId: string
  selected: number
  correctAnswer: number
  isCorrect: boolean
}

export type SavedProgress = {
  blockId: string
  blockLabel: string
  mode: 'block' | 'mega'
  queue: TestQuestionRow[]
  index: number
  answers: AnswerRecord[]
  phase: 'playing' | 'review'
  // review-specific
  reviewQueue: TestQuestionRow[]
  reviewIndex: number
  reviewAnswers: AnswerRecord[]
  reviewFixed: number
  reviewStillWrong: string[]
  savedAt: number
}

function storageKey(userId: string): string {
  return `seroin_test_progress__${userId}`
}

export function saveProgress(progress: SavedProgress, userId: string): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(progress))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function loadProgress(userId: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedProgress
    if (!parsed || !parsed.queue || parsed.queue.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function clearProgress(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // ignore
  }
}

/**
 * Extracts the numeric sequence number from a question_id like "1.1", "1.10", "2.15".
 * Returns the second part as a number for sorting within blocks.
 */
export function questionNumber(questionId: string): number {
  const parts = questionId.split('.')
  if (parts.length >= 2) {
    const n = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(n)) return n
  }
  const fallback = parseInt(questionId.replace(/[^0-9]/g, ''), 10)
  return isNaN(fallback) ? 0 : fallback
}

/**
 * Extracts the block prefix (e.g. "1" from "1.1") for grouping.
 */
export function questionBlock(questionId: string): number {
  const parts = questionId.split('.')
  if (parts.length >= 1) {
    const n = parseInt(parts[0], 10)
    if (!isNaN(n)) return n
  }
  return 0
}

/**
 * Sorts questions by numeric order: "1.2" before "1.10", not alphabetically.
 */
export function sortQuestions(questions: TestQuestionRow[]): TestQuestionRow[] {
  return [...questions].sort((a, b) => {
    const blockA = questionBlock(a.question_id)
    const blockB = questionBlock(b.question_id)
    if (blockA !== blockB) return blockA - blockB
    return questionNumber(a.question_id) - questionNumber(b.question_id)
  })
}

export const BLOCK_SIZE = 110

export type BlockDef = {
  id: string
  label: string
  rangeStart: number
  rangeEnd: number
  isMega?: boolean
}

export const BLOCKS: BlockDef[] = [
  { id: 'block1', label: 'Блок 1', rangeStart: 1, rangeEnd: 110 },
  { id: 'block2', label: 'Блок 2', rangeStart: 111, rangeEnd: 220 },
  { id: 'block3', label: 'Блок 3', rangeStart: 221, rangeEnd: 330 },
  { id: 'block4', label: 'Блок 4', rangeStart: 331, rangeEnd: 440 },
  { id: 'mega', label: 'Мега марафон', rangeStart: 1, rangeEnd: 440, isMega: true },
]

export function questionsForBlock(
  allSorted: TestQuestionRow[],
  block: BlockDef,
): TestQuestionRow[] {
  return allSorted.filter((q, idx) => {
    const seq = idx + 1 // 1-based sequence in sorted order
    return seq >= block.rangeStart && seq <= block.rangeEnd
  })
}

export function countAvailable(
  allSorted: TestQuestionRow[],
  block: BlockDef,
): { available: number; total: number } {
  const inBlock = questionsForBlock(allSorted, block)
  const available = inBlock.filter(q => q.correct_answer !== null).length
  return { available, total: inBlock.length }
}
