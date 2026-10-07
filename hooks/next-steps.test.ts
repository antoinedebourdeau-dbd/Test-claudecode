import { expect, mock, test } from 'claude-code/testing'

import type { On } from 'claude-code'

import { parseSuggestions, stripBlock } from './register'

// Stand-ins for the engine beneath the plugin: the store and the default drawing.
function engine(on: On) {
  mock.store(on)
  on('ui.render', ($, e) => ({ type: 'Text', props: {}, children: ['props' in e && 'text' in (e.props as object) ? (e.props as { text: string }).text : ''] }) as never)
}

const ANSWER = [
  'La sensibilité du test au charbon est d’environ 80 %.',
  '',
  '<next-steps>',
  '- Compare avec le test respiratoire',
  '2. Donne-moi les références',
  '* Fais un QCM sur ce point',
  '</next-steps>',
].join('\n')

test('parses and strips the block', () => {
  expect(parseSuggestions(ANSWER)).toEqual([
    'Compare avec le test respiratoire',
    'Donne-moi les références',
    'Fais un QCM sur ce point',
  ])
  expect(stripBlock(ANSWER)).toBe('La sensibilité du test au charbon est d’environ 80 %.')
})

for (const surface of ['terminal'] as const) {
  test(`buttons send the suggestion, Ignorer clears (${surface})`, async ($, on) => {
    engine(on)
    const sent: string[] = []
    on('prompt.submit', ($, e) => {
      sent.push(e.text)
      return { text: e.text }
    })
    on('turn.complete', ($, e) => ({ text: e.answer }))

    await $.turn.complete({ answer: ANSWER, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

    const props = { hasSurvey: false, isWorking: false, maxRows: 20, columns: 80 }
    const ui = await $.ui.mount({ plugin: 'next-steps', surface, component: 'AbovePrompt', props: props as never })
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(4)

    await ui.press({ key: 's2' })
    expect(sent).toEqual(['Donne-moi les références'])
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(0)

    await $.turn.complete({ answer: ANSWER, durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' })
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(4)
    await ui.press({ key: 'dismiss' })
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(0)
    expect(sent).toHaveLength(1)
  })
}

test('the transcript hides the block', async ($, on) => {
  engine(on)
  const tree = await $.ui.render({
    plugin: 'next-steps',
    component: 'AssistantMessage',
    surface: 'terminal',
    props: { text: ANSWER, isFirstOfReply: true },
  } as never)
  expect(JSON.stringify(tree)).not.toContain('next-steps>')
})

for (const surface of ['mobile', 'desktop', 'vscode'] as const) {
  test(`buttons under the latest reply (${surface})`, async ($, on) => {
    engine(on)
    const sent: string[] = []
    on('prompt.submit', ($, e) => {
      sent.push(e.text)
      return { text: e.text }
    })
    on('turn.complete', ($, e) => ({ text: e.answer }))
    await $.turn.complete({ answer: ANSWER, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

    const ui = await $.ui.mount({
      plugin: 'next-steps',
      surface,
      component: 'AssistantMessage',
      props: { text: ANSWER, isFirstOfReply: true },
    })
    expect(JSON.stringify(await ui.drawn())).not.toContain('next-steps>')
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(4)
    await ui.press({ key: 's3' })
    expect(sent).toEqual(['Fais un QCM sur ce point'])
    expect(await ui.findAll({ type: 'Button' })).toHaveLength(0)
  })
}
