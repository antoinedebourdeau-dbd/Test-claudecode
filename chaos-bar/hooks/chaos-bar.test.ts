import { expect, mock, test } from 'claude-code/testing'

import type { On } from 'claude-code'

import { countdown, heat, label, money } from './register'

const NOW = Date.parse('2026-10-07T12:00:00Z')

const USAGE = {
  startedAt: NOW - 2 * 3_600_000,
  context: { tokens: 172_000, window: 200_000, percent: 86 },
  rateLimits: [
    { kind: 'seven_day', percentUsed: 41, resetsAt: '2026-10-10T15:00:00Z' },
    { kind: 'five_hour', percentUsed: 92.5, resetsAt: '2026-10-07T13:30:00Z' },
    { kind: 'seven_day_overage_included', percentUsed: 12 },
  ],
  cost: { usd: 4.2 },
}

// Stand-ins for the engine: the store, the clock, the usage figures, an empty band.
function engine(on: On) {
  mock.store(on)
  on('clock.now', () => ({ value: NOW }) as never)
  on('session.usage', () => ({ value: USAGE }) as never)
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', ($, e) => ({ cwd: '/tmp' }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
}

test('helpers', () => {
  expect(label('five_hour')).toBe('5h')
  expect(label('seven_day_overage_included')).toBe('Fable')
  expect(heat(10)).toBe('#39ff14')
  expect(heat(95)).toBe('#ff0055')
  expect(countdown('2026-10-07T13:30:00Z', NOW)).toBe('1h30')
  expect(countdown('2026-10-10T15:00:00Z', NOW)).toBe('3j3h')
  expect(money(4.2)).toBe('$4.20')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws the gauges (${surface})`, async ($, on) => {
    engine(on)
    await $.session.start({ source: 'startup', cwd: '/tmp' } as never)
    const props = { hasSurvey: false, isWorking: false, maxRows: 20, columns: 140, bodyColumns: 135 }
    const ui = await $.ui.mount({ plugin: 'chaos-bar', surface, component: 'AbovePrompt', props: props as never })
    const text = JSON.stringify(await ui.drawn())
    for (const s of ['5h', 'Sem', 'Fable', '8%', '59%', '88%', 'Ctx', '/compact', '$4.20', '$2.10/h', '↻1h30']) {
      expect(text).toContain(s)
    }
    expect(text.indexOf('"5h ')).toBeLessThan(text.indexOf('"Sem '))
  })
}
