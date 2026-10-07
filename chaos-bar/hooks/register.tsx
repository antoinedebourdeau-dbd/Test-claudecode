import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Gauge, Snapshot } from '../types'

const snapshot = atom({ plugin: 'chaos-bar', key: 'snapshot' } as const, null)
const isHidden = atom({ plugin: 'chaos-bar', key: 'isHidden' } as const, false)
const turns = atom({ plugin: 'chaos-bar', key: 'turns' } as const, 0)

const HIDDEN_KEY = 'hidden'

// Palette chaos : vert acide → jaune toxique → orange radioactif → rouge alarme.
const ACID = '#39ff14'
const TOXIC = '#ffe600'
const RADIO = '#ff6a00'
const ALARM = '#ff0055'
const NEON = '#ff00ff'
const CYAN = '#00f0ff'
const VOID = '#5a5a7a'

const TITLE_COLORS = [NEON, CYAN, ACID, TOXIC, RADIO, ALARM]
const GLITCH = ['☢', '☣', '⚡', '✷', '☠', '⌁']

// Fenêtre hebdo par modèle : c'est le seau que Claude Code appelle « Fable limit ».
const FABLE_KINDS = new Set(['seven_day_overage_included'])

export function heat(percentUsed: number): string {
  if (percentUsed >= 90) return ALARM
  if (percentUsed >= 75) return RADIO
  if (percentUsed >= 50) return TOXIC
  return ACID
}

export function label(kind: string): string {
  if (kind === 'five_hour') return '5h'
  if (kind === 'seven_day') return 'Sem'
  if (FABLE_KINDS.has(kind) || kind.includes('fable')) return 'Fable'
  if (kind === 'seven_day_opus') return 'Opus'
  if (kind === 'seven_day_sonnet') return 'Sonnet'
  if (kind === 'spend_limit') return 'Crédits'
  return kind.replace(/_/g, ' ')
}

export function countdown(resetsAt: string | undefined, now: number): string | undefined {
  if (!resetsAt) return undefined
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms)) return undefined
  if (ms <= 0) return 'reset'
  const minutes = Math.round(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}j${hours}h`
  if (hours > 0) return `${hours}h${String(mins).padStart(2, '0')}`
  return `${mins}min`
}

export function money(usd: number): string {
  return usd < 10 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(1)}`
}

function toSnapshot(u: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost' | 'startedAt'>, at: number): Snapshot {
  return {
    contextPercent: u.context.percent,
    contextTokens: u.context.tokens,
    contextWindow: u.context.window,
    limits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
    costUsd: u.cost?.usd,
    startedAt: u.startedAt,
    at,
  }
}

async function refresh($: EngineInterface) {
  const now = await $.clock.now()
  const usage = await $.session.usage()
  await update($, snapshot, () => toSnapshot(usage, now))
}

export const register: Register = on => {
  // Seuils déjà signalés par un toast, pour ne pas spammer.
  const warned = new Set<string>()

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'chaos-bar', description: 'Barre de jauges chaos : on | off' })
    if ((await $.store.get(HIDDEN_KEY)) === true) await update($, isHidden, () => true)
    await refresh($).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: 'chaos-bar' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off' || arg === 'on') {
      const hide = arg === 'off'
      await $.store.set(HIDDEN_KEY, hide)
      await update($, isHidden, () => hide)
      return { text: hide ? 'Chaos-bar masquée (/chaos-bar on pour la ramener).' : 'Chaos-bar réactivée. ☢' }
    }
    return { text: 'Usage : /chaos-bar on | off' }
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)

    const ctx = e.context.percent ?? 0
    if (ctx >= 85 && !warned.has('ctx85')) {
      warned.add('ctx85')
      $.ui.toast(`☢ Contexte à ${ctx} % — lance /compact avant l'auto-compaction`)
    }
    if (ctx < 50) warned.delete('ctx85')

    for (const r of e.rateLimits) {
      const id = `${r.kind}90`
      if (r.percentUsed >= 90 && !warned.has(id)) {
        warned.add(id)
        $.ui.toast(`☠ ${label(r.kind)} : plus que ${Math.max(0, Math.round(100 - r.percentUsed))} % restants`)
      }
      if (r.percentUsed < 50) warned.delete(id)
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, turns, n => (n ?? 0) + 1)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || snap === null || (await read($, isHidden))) return below

    const { Box, Text } = $.ui.resolve(e)
    const tick = await read($, turns)
    const now = await $.clock.now()
    const columns = e.props.bodyColumns
    const cells = columns >= 120 ? 10 : columns >= 90 ? 6 : 4

    const bar = (percentUsed: number, key: string) => {
      const filled = Math.round((Math.min(100, Math.max(0, percentUsed)) / 100) * cells)
      return (
        <Text key={key}>
          {Array.from({ length: cells }, (_, i) => {
            const at = ((i + 1) / cells) * 100
            return i < filled ? (
              <Text key={`${key}${i}`} color={heat(at)}>{at > 90 ? '█' : at > 50 ? '▓' : '▒'}</Text>
            ) : (
              <Text key={`${key}${i}`} color={VOID}>░</Text>
            )
          })}
        </Text>
      )
    }

    const gauge = (g: Gauge) => {
      const left = Math.max(0, Math.round(100 - g.percentUsed))
      const reset = countdown(g.resetsAt, now)
      return (
        <Box key={g.kind} marginRight={2}>
          <Text color={CYAN} bold>{`${label(g.kind)} `}</Text>
          {bar(g.percentUsed, g.kind)}
          <Text color={heat(g.percentUsed)} bold inverse={g.percentUsed >= 90}>{` ${left}%`}</Text>
          {reset ? <Text color={VOID}>{` ↻${reset}`}</Text> : null}
        </Box>
      )
    }

    const ordered = [...snap.limits].sort((a, b) => rank(a.kind) - rank(b.kind))
    const hasFable = ordered.some(g => label(g.kind) === 'Fable')

    const ctx = snap.contextPercent
    const ctxNote = ctx === undefined ? '' : ctx >= 85 ? ' ⚠ /compact !' : ctx >= 70 ? ' bientôt /compact' : ''
    const tokens = snap.contextTokens !== undefined ? ` ${Math.round(snap.contextTokens / 1000)}k/${Math.round(snap.contextWindow / 1000)}k` : ''

    const hours = Math.max((now - snap.startedAt) / 3_600_000, 1 / 60)
    const cost = snap.costUsd

    const glyph = GLITCH[tick % GLITCH.length]
    const title = 'CHAOS'.split('').map((ch, i) => (
      <Text key={`t${i}`} color={TITLE_COLORS[(i + tick) % TITLE_COLORS.length]} bold>{ch}</Text>
    ))

    const bar_ = (
      <Box flexDirection={columns >= 110 ? 'row' : 'column'}>
        <Box marginRight={2}>
          <Text color={NEON} bold>{`${glyph} `}</Text>
          {title}
        </Box>
        <Box flexWrap="wrap">
          {ordered.length === 0 ? (
            <Box marginRight={2}><Text color={VOID}>quotas : pas encore de lecture</Text></Box>
          ) : (
            ordered.map(gauge)
          )}
          {ordered.length > 0 && !hasFable ? (
            <Box marginRight={2}><Text color={CYAN} bold>Fable </Text><Text color={VOID}>—</Text></Box>
          ) : null}
          <Box marginRight={2}>
            <Text color={NEON} bold>Ctx </Text>
            {ctx === undefined ? <Text color={VOID}>—</Text> : bar(ctx, 'ctx')}
            {ctx === undefined ? null : <Text color={heat(ctx)} bold inverse={ctx >= 85}>{` ${ctx}%`}</Text>}
            <Text color={VOID}>{tokens}</Text>
            {ctxNote ? <Text color={heat(ctx ?? 0)} bold>{ctxNote}</Text> : null}
          </Box>
          {cost === undefined ? null : (
            <Box>
              <Text color={TOXIC} bold>{money(cost)}</Text>
              <Text color={VOID}>{` (${money(cost / hours)}/h)`}</Text>
            </Box>
          )}
        </Box>
      </Box>
    )

    return below.type === 'engine' ? bar_ : (
      <Box flexDirection="column">
        {bar_}
        {below}
      </Box>
    )
  })
}

function rank(kind: string): number {
  if (kind === 'five_hour') return 0
  if (kind === 'seven_day') return 1
  if (label(kind) === 'Fable') return 2
  return 3
}
