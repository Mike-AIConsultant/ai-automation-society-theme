import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Party } from '../types'

import { SCENE_SVG } from './bg.js'
import { makeColors } from './make-colors.js'
import { LENGTH_MS, partyScene, type PartyKind } from './party.js'

// AI Automation Society theme. The background is the glowing card from the bottom of
// aiautomationsociety.ai (moving light, globe logo, name, pine ridge), rebuilt as shapes:
// the app draws no pictures and no blur filters in a scene. Made by Mike Zam as a member
// gift, with the AIS team's permission.
// Celebrations: confetti each time a step of Claude's task list is finished, AI-ray
// fireworks when the whole task is done. /ais-confetti and /ais-fireworks try them by hand.
const SCENE_ID = 'ais-card'
// Empty: the theme shows in every folder (the shared version). Otherwise a pattern the
// chat's folder must match, so a personal copy shows only in one place.
const FOLDER_ONLY: string = ''

const { theme, problems } = makeColors({
  label: 'AI Automation Society',
  roles: { accent: '#37bdf8', danger: '#e0444f', success: '#3fb27f', warning: '#e3962f', pro: '#a68bf5' },
  only: 'dark',
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0c1218',
        'surface-1': '#101820',
        'surface-2': '#141d26',
        'surface-3': '#18222c',
        'text-primary': '#f1f6fa',
        'text-secondary': '#c6d2dc',
        'text-muted': '#97a7b5',
      },
    },
  },
})

// A scene gets glass: no blur, and a light dark film so the chat text reads.
const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE_ID, glass: { blur: 0, tint: '#0c1218', opacity: 0.35 } },
}

const party = atom({ plugin: 'ai-automation-society-theme', key: 'party' } as const, { kind: 'none', n: 0, until: 0 } as Party, {
  shape: 'party-1',
})

let painted = false
let resetTimer: ReturnType<EngineInterface['clock']['after']> | undefined
// How many steps of the task list were done at the last look, so only a new one counts.
let doneBefore = 0

async function paint($: EngineInterface) {
  if (painted) {
    return
  }
  // The desktop app starts each chat in a spare folder and only then moves it into the
  // project folder, so the folder is checked again whenever it can change.
  if (FOLDER_ONLY !== '') {
    const folders = await Promise.all([$.session.root(), $.session.cwd()].map(p => p.catch(() => '')))

    if (!folders.some(path => new RegExp(FOLDER_ONLY).test(path))) {
      return
    }
  }
  const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }
  const set = await $.theme.set(LOOK)

  if (set.isDrawn) {
    painted = true
    $.ui.status(undefined)
    // Named ais-* so they never clash with another theme's /confetti or /fireworks.
    for (const [name, description] of [
      ['ais-confetti', 'Blow AIS confetti over the screen'],
      ['ais-fireworks', 'Launch the AIS AI-ray fireworks'],
    ] as const) {
      await $.command.register({ name, description }).catch(() => undefined)
    }
  } else {
    $.ui.status(set.reason)
  }
}

async function celebrate($: EngineInterface, kind: PartyKind): Promise<string> {
  const now = await $.clock.now()
  const current = await read($, party)

  // Confetti never cuts fireworks short.
  if (kind === 'confetti' && current.kind === 'fireworks' && now < current.until) {
    return 'Fireworks already on screen.'
  }
  await update($, party, (p): Party => ({ kind, n: p.n + 1, until: now + LENGTH_MS[kind] }))
  resetTimer?.cancel()
  resetTimer = $.clock.after(LENGTH_MS[kind], () => {
    void update($, party, (p): Party => ({ ...p, kind: 'none' }))
  })
  return kind === 'fireworks' ? 'Fireworks!' : 'Confetti!'
}

type Step = { status?: string }
const countDone = (steps: unknown) =>
  Array.isArray(steps) ? (steps as Step[]).filter(s => s?.status === 'completed').length : 0

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await paint($)
    return next(e)
  })

  on('classic.CwdChanged', async ($, e, next) => {
    await paint($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await paint($)
    return next(e)
  })

  on('command.run', { command: 'ais-confetti' }, async $ => ({ text: await celebrate($, 'confetti') }))
  on('command.run', { command: 'ais-fireworks' }, async $ => ({ text: await celebrate($, 'fireworks') }))

  // One hook watches the task list. Claude Code's TodoWrite (terminal and IDE): a newly
  // finished step blows confetti, the last one launches the fireworks. The desktop app's
  // update_plan: a step moving on blows confetti; its wrap_up, when the turn's work is
  // done, launches the fireworks.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    const call = e as unknown as {
      tool: string
      todos?: Step[]
      advance?: boolean
      done?: number[]
      items?: Step[]
    }

    if (call.tool === 'TodoWrite') {
      const steps = call.todos ?? []
      const done = countDone(steps)

      if (steps.length > 0 && done === steps.length && done > doneBefore) {
        await celebrate($, 'fireworks')
      } else if (done > doneBefore) {
        await celebrate($, 'confetti')
      }
      doneBefore = done
    } else if (call.tool === 'mcp__ccd_turn__update_plan') {
      if (call.items !== undefined) {
        doneBefore = countDone(call.items)
      } else if (call.advance === true || (call.done?.length ?? 0) > 0) {
        await celebrate($, 'confetti')
      }
    } else if (call.tool === 'mcp__ccd_turn__wrap_up') {
      await celebrate($, 'fireworks')
    }
    return result
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_ID) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const now = await read($, party)
    const isLive = now.kind !== 'none' && (await $.clock.now()) < now.until
    const source = isLive && now.kind !== 'none' ? partyScene(SCENE_SVG, now.kind, now.n) : SCENE_SVG

    return (
      <Svg
        source={source}
        alt="The AI Automation Society card: a glowing, slowly moving cyan and blue sky, the globe logo, the name, and dark pines at the bottom right"
        isInteractive
      />
    )
  })
}
