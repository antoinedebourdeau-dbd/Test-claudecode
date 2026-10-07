import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Step } from '../types'
import { EMPTY, bar, formatElapsed, line, summary, withTimes } from './progress'

const progress = atom({ plugin: 'progress-bar', key: 'progress' } as const, EMPTY)
const now = atom({ plugin: 'progress-bar', key: 'now' } as const, 0)

async function refresh($: EngineInterface) {
  const t = await $.clock.now()
  await update($, now, () => t)
  const p = await read($, progress)
  $.ui.status(p.steps.length > 0 ? line(p, t) : undefined)
}

export const register: Register = on => {
  // Chronomètre : rafraîchit la barre chaque seconde tant qu'une tâche est en cours.
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    $.clock.every(1000, async () => {
      const p = await read($, progress)
      if (p.steps.length > 0 && p.finishedAt === null) await refresh($)
    })
    return r
  })

  // Une nouvelle demande remet le compteur à zéro si la tâche précédente est terminée.
  on('prompt.submit', async ($, e, next) => {
    const p = await read($, progress)
    if (p.finishedAt !== null) await update($, progress, () => EMPTY)
    await refresh($)
    return next(e)
  })

  // Liste d'étapes via TodoWrite
  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && !r.isError) {
      const t = await $.clock.now()
      const steps: Step[] = e.todos.map((td, i) => ({
        id: String(i),
        label: td.content,
        active: td.activeForm,
        status: td.status,
      }))
      await update($, progress, p => withTimes(p, steps, t))
      await refresh($)
    }
    return r
  })

  // Liste d'étapes via TaskCreate / TaskUpdate
  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && !r.isError && r.result) {
      const t = await $.clock.now()
      const id = (r.result as { task: { id: string } }).task.id
      await update($, progress, p => {
        const base = p.finishedAt !== null ? EMPTY : p
        const step: Step = { id, label: e.subject, active: e.activeForm ?? e.subject, status: 'pending' }
        return withTimes(base, [...base.steps, step], t)
      })
      await refresh($)
    }
    return r
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && !r.isError) {
      const t = await $.clock.now()
      await update($, progress, p => {
        const steps = p.steps
          .filter(s => !(s.id === e.taskId && e.status === 'deleted'))
          .map(s =>
            s.id !== e.taskId
              ? s
              : {
                  ...s,
                  label: e.subject ?? s.label,
                  active: e.activeForm ?? s.active,
                  status: e.status && e.status !== 'deleted' ? e.status : s.status,
                },
          )
        return withTimes(p, steps, t)
      })
      await refresh($)
    }
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const p = await read($, progress)
    if (e.props.hasSurvey || p.steps.length === 0) return next(e)

    const t = await read($, now)
    const { total, done, current, elapsed, finished } = summary(p, t)
    const { Box, Text } = $.ui.resolve(e)
    const pct = Math.round((done / total) * 100)
    const width = Math.max(10, Math.min(30, e.props.bodyColumns - 40))

    return (
      <Box flexDirection="column">
        <Box>
          <Text color={finished ? 'green' : 'cyan'}>{bar(done, total, width)}</Text>
          <Text bold>{` ${done}/${total}`}</Text>
          <Text dimColor>{` (${pct} %) · ⏱ ${formatElapsed(elapsed)}`}</Text>
        </Box>
        <Text key="current" dimColor={finished}>
          {finished
            ? '✔ Toutes les étapes sont terminées'
            : current
              ? `▶ Étape ${p.steps.indexOf(current) + 1} : ${current.active || current.label}`
              : '… en attente de la prochaine étape'}
        </Text>
      </Box>
    )
  })
}
