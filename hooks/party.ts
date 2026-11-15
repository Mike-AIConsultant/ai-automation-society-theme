// Celebrations drawn on top of the AIS scene (viewBox 1372 x 837).
// Confetti: glowing little rectangles in the AIS blues plus a few bright colours,
// blown over the screen when a plan step is finished.
// Fireworks: "AI ray" bursts. Each one is a streak that rises, a white core that
// flashes, light rays that shoot outward, and sparks that fly out, drift down and
// fade. Big bursts in blue, cyan, white and a touch of violet. Confetti finale.
// Every animation runs once and ends invisible.

export type PartyKind = 'confetti' | 'fireworks'

const W = 1372
const H = 837

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const f = (n: number) => n.toFixed(1)

// Delays as classes (no inline styles in the scene).
const delays = new Map<string, string>()
function dc(delay: number): string {
  const key = delay.toFixed(2)
  let name = delays.get(key)
  if (name === undefined) {
    name = `dl${delays.size}`
    delays.set(key, name)
  }
  return name
}
function delayRules(): string {
  let css = ''
  for (const [key, name] of delays) {
    css += `.${name}{animation-delay:${key}s}`
  }
  return css
}

const CONFETTI_COLORS = ['#37bdf8', '#ffffff', '#7dd3fc', '#3b82f6', '#a78bfa', '#5eead4', '#f472b6', '#facc15']

function confetti(count: number, seed: number, start: number, spread: number): string {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = r() * W
    const w = 7 + r() * 7
    const h = w * (1.6 + r() * 0.8)
    const kind = 1 + Math.floor(r() * 4)
    const c = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const d = dc(start + r() * spread)
    // A soft halo behind each piece gives the glow (the app ignores blur filters).
    out +=
      `<g class="cf cf${kind} ${d}"><g transform="translate(${f(x)} -30) rotate(${f(r() * 360)})">` +
      `<rect x="${f(-w)}" y="${f(-h)}" width="${f(w * 2)}" height="${f(h * 2)}" rx="${f(w)}" fill="${c}" opacity=".22"/>` +
      `<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="1.5" fill="${c}"/></g></g>`
  }
  return out
}

const RAY_COLORS: [string, string][] = [
  ['#1d4ed8', '#ffffff'],
  ['#2563eb', '#e0f2fe'],
  ['#0369a1', '#ffffff'],
  ['#6d28d9', '#ede9fe'],
  ['#0284c7', '#ffffff'],
]

function burst(x: number, y: number, size: number, at: number, k: number, r: () => number): string {
  const [ray, tip] = RAY_COLORS[k % RAY_COLORS.length]!
  const n = 20 + Math.floor(r() * 6)
  let rays = ''
  let sparks = ''
  let halos = ''
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + r() * 0.15
    const len = size * (0.8 + r() * 0.3)
    const tx = Math.cos(a) * len
    const ty = Math.sin(a) * len
    rays += `<path class="ray ${dc(at + 0.7)}" d="M0 0L${f(tx)} ${f(ty)}" pathLength="100"/>`
    // Sparks fly out with the burst, then drift down and fade. A soft halo behind
    // each one gives the glow (the app ignores blur filters).
    const rr = 2.6 + r() * 1.6
    halos += `<circle cx="${f(tx)}" cy="${f(ty)}" r="${f(rr * 2)}"/>`
    sparks += `<circle cx="${f(tx)}" cy="${f(ty)}" r="${f(rr)}"/><circle cx="${f(tx * 0.62)}" cy="${f(ty * 0.62)}" r="${f(rr * 0.7)}"/>`
  }
  return (
    `<g transform="translate(${f(x)} ${f(y)})">` +
    `<path class="streak ${dc(at)}" d="M0 ${f(H - y + 40)}V0" stroke="${tip}" pathLength="100"/>` +
    `<g class="boom ${dc(at + 0.7)}">` +
    `<circle class="flash" r="${f(size * 0.28)}" fill="url(#core)"/>` +
    // Glowing rays: a wide faint glow, a softer inner glow, and a fine bright core.
    `<g stroke="${ray}" stroke-width="11" opacity=".16" stroke-linecap="round" fill="none">${rays}</g>` +
    `<g stroke="${ray}" stroke-width="4.5" opacity=".45" stroke-linecap="round" fill="none">${rays}</g>` +
    `<g stroke="${tip}" stroke-width="1.4" stroke-linecap="round" fill="none">${rays}</g>` +
    `<g class="drop ${dc(at + 0.7)}"><g class="fly ${dc(at + 0.7)}">` +
    `<g fill="${ray}" opacity=".3">${halos}</g><g fill="${tip}">${sparks}</g></g></g>` +
    `</g></g>`
  )
}

function fireworks(count: number, seed: number, start: number, span: number): string {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = 120 + r() * (W - 240)
    const y = 120 + r() * 300
    const size = 170 + r() * 150
    const at = start + (span * i) / count + r() * 0.3
    out += burst(x, y, size, at, Math.floor(r() * RAY_COLORS.length), r)
  }
  return out
}

const CSS = `
.cf{opacity:0;animation-timing-function:linear;animation-fill-mode:both}
.cf1{animation-name:fall1;animation-duration:4.2s}
.cf2{animation-name:fall2;animation-duration:5s}
.cf3{animation-name:fall3;animation-duration:3.7s}
.cf4{animation-name:fall4;animation-duration:4.6s}
@keyframes fall1{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(70px,900px) rotate(720deg)}}
@keyframes fall2{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(-90px,900px) rotate(-540deg)}}
@keyframes fall3{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(40px,900px) rotate(900deg)}}
@keyframes fall4{0%{opacity:1;transform:translate(0,0) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translate(-30px,900px) rotate(-800deg)}}
.cf>g{transform-box:fill-box;transform-origin:50% 50%}
.streak{fill:none;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:18 100;stroke-dashoffset:118;opacity:0;animation:rise .7s ease-out both}
@keyframes rise{0%{stroke-dashoffset:118;opacity:0}8%{opacity:1}90%{opacity:1}100%{stroke-dashoffset:0;opacity:0}}
.boom{opacity:0;animation:boom 3.8s ease-out both}
@keyframes boom{0%{opacity:1}70%{opacity:1}100%{opacity:0}}
.ray{stroke-dasharray:60 140;stroke-dashoffset:60;animation:ray 2.2s cubic-bezier(.12,.8,.3,1) both}\n@keyframes ray{0%{stroke-dashoffset:60}100%{stroke-dashoffset:-40}}\n.fly{transform-origin:0 0;animation:fly 2s cubic-bezier(.12,.8,.3,1) both}\n@keyframes fly{0%{transform:scale(.05)}100%{transform:scale(1)}}\n.drop{animation:drop 3.8s ease-in both}\n@keyframes drop{0%{transform:translateY(0)}100%{transform:translateY(90px)}}\n.flash{animation:flash .6s ease-out both}\n@keyframes flash{0%{opacity:.7}100%{opacity:0}}
`

const DEFS =
  '<defs><radialGradient id="core"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>' +
  '<stop offset=".25" stop-color="#7dd3fc" stop-opacity=".55"/><stop offset="1" stop-color="#37bdf8" stop-opacity="0"/></radialGradient></defs>'

const CONFETTI_LAYER = confetti(140, 7, 0, 1.4)
const FIREWORKS_LAYER = fireworks(9, 29, 0, 6.5) + confetti(140, 13, 6.2, 1.6)

export const LENGTH_MS: Record<PartyKind, number> = { confetti: 6800, fireworks: 13500 }

// The scene with a celebration on top. `n` makes each one a new drawing, so its
// animations start again from zero.
export function partyScene(scene: string, kind: PartyKind, n: number): string {
  const layer = kind === 'fireworks' ? FIREWORKS_LAYER : CONFETTI_LAYER
  const extra = `<style>${CSS}${delayRules()}</style>${DEFS}${layer}<!-- ${kind} ${n} -->`
  const end = scene.lastIndexOf('</svg>')
  return scene.slice(0, end) + extra + '</svg>'
}
