import type { Progress, Step } from '../types'

export const EMPTY: Progress = { steps: [], startedAt: null, finishedAt: null }

export const formatElapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

export const bar = (done: number, total: number, width = 20): string => {
  const filled = total === 0 ? 0 : Math.round((done / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

// Ajuste startedAt / finishedAt après une modification de la liste d'étapes.
export const withTimes = (p: Progress, steps: Step[], now: number): Progress => {
  if (steps.length === 0) return EMPTY
  const allDone = steps.every(s => s.status === 'completed')
  const startedAt = p.startedAt ?? now
  return { steps, startedAt, finishedAt: allDone ? (p.finishedAt ?? now) : null }
}

export const summary = (p: Progress, now: number) => {
  const total = p.steps.length
  const done = p.steps.filter(s => s.status === 'completed').length
  const current = p.steps.find(s => s.status === 'in_progress')
  const end = p.finishedAt ?? now
  const elapsed = p.startedAt === null ? 0 : end - p.startedAt
  return { total, done, current, elapsed, finished: p.finishedAt !== null }
}

export const line = (p: Progress, now: number): string => {
  const { total, done, current, elapsed, finished } = summary(p, now)
  const what = finished ? 'Terminé' : current ? current.active || current.label : 'En attente'
  return `${bar(done, total, 10)} ${done}/${total} · ${what} · ${formatElapsed(elapsed)}`
}
