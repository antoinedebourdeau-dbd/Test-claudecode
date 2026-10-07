declare module 'claude-code' {
  interface PluginState {
    'next-steps': { suggestions: string[] }
  }
}

export type Suggestions = string[]
