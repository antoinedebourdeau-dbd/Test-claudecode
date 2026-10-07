import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { bar, formatElapsed } from '../hooks/progress'

const SCROLL = { offset: 0, bodyRows: 10 }

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 80, scroll: SCROLL, view: {} },
} as const

const drawn = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'progress-bar', surface: 'terminal', ...BAND })
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text).join('')
  await ui.unmount()
  return texts
}

test('helpers', async () => {
  expect(formatElapsed(83_000)).toBe('01:23')
  expect(formatElapsed(3_723_000)).toBe('1:02:03')
  expect(bar(2, 4, 8)).toBe('████░░░░')
})

test('suit TaskCreate / TaskUpdate sur 4 étapes, avec chrono', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  let n = 0
  on('tool.call', { tool: 'TaskCreate' }, () => ({ result: { task: { id: String(++n), subject: 'x' } } }))
  on('tool.call', { tool: 'TaskUpdate' }, (_$, e) => ({
    result: { success: true, taskId: e.taskId, updatedFields: ['status'] },
  }))

  for (const s of ['Créer', 'Remplir', 'Calculer', 'Vérifier']) {
    await $.tool.call({ tool: 'TaskCreate', subject: s, description: s, activeForm: `${s} en cours` })
  }
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
  await clock.advance(65_000)
  await $.tool.call({ tool: 'TaskUpdate', taskId: '2', status: 'in_progress' })

  const mid = await drawn($)
  expect(mid).toContain('1/4')
  expect(mid).toContain('Étape 2 : Remplir en cours')
  expect(mid).toContain('01:05')

  for (const id of ['2', '3', '4']) await $.tool.call({ tool: 'TaskUpdate', taskId: id, status: 'completed' })
  await clock.advance(30_000)
  const end = await drawn($)
  expect(end).toContain('4/4')
  expect(end).toContain('terminées')
  expect(end).toContain('01:05') // chrono figé à la fin
})

test('suit TodoWrite', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: 'TodoWrite' }, (_$, e) => ({ result: { oldTodos: [], newTodos: e.todos } }))
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'A', status: 'completed', activeForm: 'A…' },
      { content: 'B', status: 'in_progress', activeForm: 'B…' },
      { content: 'C', status: 'pending', activeForm: 'C…' },
    ],
  })
  const t = await drawn($)
  expect(t).toContain('1/3')
  expect(t).toContain('Étape 2 : B…')
})
