import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const suggestions = atom({ plugin: 'next-steps', key: 'suggestions' } as const, [] as string[])

const ENABLED_KEY = 'enabled'
const BLOCK = /<next-steps>([\s\S]*?)<\/next-steps>/i
const BLOCK_ALL = /\s*<next-steps>[\s\S]*?(<\/next-steps>|$)/gi

const INSTRUCTION = [
  'At the very end of every reply, append exactly three short, concrete next-step suggestions the user could send you next,',
  'written in the language of the conversation, from the user\'s point of view (as a prompt they would type), each under 80 characters,',
  'in this exact format and nothing after it:',
  '<next-steps>',
  '- first suggestion',
  '- second suggestion',
  '- third suggestion',
  '</next-steps>',
  'The block is hidden from the transcript and shown as buttons, so do not refer to it in your text.',
].join('\n')

export function parseSuggestions(text: string): string[] {
  const m = BLOCK.exec(text)
  if (!m) return []
  return (m[1] ?? "")
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(line => line.length > 0)
    .slice(0, 3)
}

export function stripBlock(text: string): string {
  return text.replace(BLOCK_ALL, '').trimEnd()
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'next-steps',
      description: 'Suggestions de prochaine étape : on | off | clear',
    })
    return next(e)
  })

  on('command.run', { command: 'next-steps' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off') {
      await $.store.set(ENABLED_KEY, false)
      await update($, suggestions, () => [])
      return { text: 'Suggestions désactivées (/next-steps on pour les réactiver).' }
    }
    if (arg === 'on') {
      await $.store.set(ENABLED_KEY, true)
      return { text: 'Suggestions activées.' }
    }
    if (arg === 'clear') {
      await update($, suggestions, () => [])
      return { text: 'Suggestions masquées.' }
    }
    const on_ = (await $.store.get(ENABLED_KEY)) !== false
    return { text: `Suggestions ${on_ ? 'activées' : 'désactivées'}. Usage : /next-steps on | off | clear` }
  })

  // Ask the model for the block.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!((await $.store.get(ENABLED_KEY)) !== false)) return composed
    return {
      ...composed,
      sections: [...composed.sections, { id: 'next-steps:instruction', text: INSTRUCTION, scope: 'session' as const }],
    }
  })

  // A new prompt makes the previous suggestions stale.
  on('prompt.submit', async ($, e, next) => {
    await update($, suggestions, () => []).catch(() => undefined)
    return next(e)
  })

  // Capture the block at the end of the main loop's turn.
  on('turn.complete', async ($, e, next) => {
    if (!e.agentId && e.reason === 'answer' && ((await $.store.get(ENABLED_KEY)) !== false)) {
      const found = parseSuggestions(e.answer)
      await update($, suggestions, () => found)
    }
    return next(e)
  })

  // Hide the raw block from the transcript.
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (!/<next-steps>/i.test(e.props.text)) return next(e)
    return next({ ...e, props: { ...e.props, text: stripBlock(e.props.text) } })
  })

  // The buttons above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Whatever other mods draw in the band (chaos-bar) stays above the buttons.
    const below = await next(e)
    const list = await read($, suggestions)
    if (e.props.hasSurvey || e.props.isWorking || list.length === 0 || !((await $.store.get(ENABLED_KEY)) !== false)) {
      return below
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const send = async (text: string) => {
      await update($, suggestions, () => [])
      void $.prompt.submit({ text, asUser: true })
    }
    return (
      <Box flexDirection="column">
        {below.type === 'engine' ? null : below}
        <Text dimColor>Prochaines étapes :</Text>
        {list.map((s, i) => (
          <Button key={`s${i + 1}`} label={s} hotkey={String(i + 1)} plain onPress={() => send(s)} />
        ))}
        <Button
          key="dismiss"
          label="Ignorer"
          hotkey="x"
          plain
          dimColor
          onPress={() => update($, suggestions, () => [])}
        />
      </Box>
    )
  })
}
