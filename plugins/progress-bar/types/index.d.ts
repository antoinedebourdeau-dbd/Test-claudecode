export type StepStatus = 'pending' | 'in_progress' | 'completed'
export type Step = { id: string; label: string; active: string; status: StepStatus }
export type Progress = { steps: Step[]; startedAt: number | null; finishedAt: number | null }

declare module 'claude-code' {
  interface PluginState {
    'progress-bar': { progress: Progress; now: number }
  }
}
