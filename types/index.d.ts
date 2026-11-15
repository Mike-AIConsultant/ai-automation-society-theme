export type Party = { kind: 'none' | 'confetti' | 'fireworks'; n: number; until: number }

declare module 'claude-code' {
  interface PluginState {
    'ai-automation-society-theme': { party: Shaped<Party> }
  }
}
