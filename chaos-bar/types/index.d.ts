export type Gauge = { kind: string; percentUsed: number; resetsAt?: string }

export type Snapshot = {
  /** % of the context window filled by the last response, if known. */
  contextPercent?: number
  contextTokens?: number
  contextWindow: number
  limits: Gauge[]
  costUsd?: number
  startedAt: number
  /** When this snapshot was taken, in $.clock.now() milliseconds. */
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'chaos-bar': { snapshot: Snapshot | null; isHidden: boolean; turns: number }
  }
}
