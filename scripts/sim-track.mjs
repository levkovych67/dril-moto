// scripts/sim-track.mjs — безголовий прогін треків на справжній фізиці двигуна.
//   node scripts/sim-track.mjs [пак.mrg | трек.json] [--driver ai,gas,bot,plan] [--seconds N] [--no-plan]
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CANVAS_STUB = 'export class GameCanvas { static advanceFlagAnimation() {} }'
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/(^|\/)GameCanvas\.ts$/.test(specifier)) return { url: `data:text/javascript,${encodeURIComponent(CANVAS_STUB)}`, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})

const { GamePhysics } = await import('../src/GamePhysics.ts')
const { LevelLoader } = await import('../src/LevelLoader.ts')
const { FileStream } = await import('../src/utils/FileStream.ts')
const { decodeMrg, encodeMrg } = await import('../src/shell/mrg.ts')
const { parsePackJson } = await import('../src/shell/trackJson.ts')

const args = process.argv.slice(2)
const VALUE_FLAGS = new Set(['--driver', '--seconds'])
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const file = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(args[i - 1])) ?? fileURLToPath(new URL('../src/assets/dev-pack.mrg', import.meta.url))
const drivers = (flag('driver', 'ai,gas,bot') ?? '').split(',')
const planFallback = !args.includes('--no-plan') && !args.includes('--driver')
const limitMs = Number(flag('seconds', '90')) * 1000

const loadPack = (path) => {
  const raw = readFileSync(resolve(path))
  if (path.endsWith('.json')) {
    const pack = parsePackJson(JSON.parse(raw.toString('utf8')))
    const leagues = pack.leagues.map((l) => l.map((t, i) => (/^[\x20-\x7e]{1,39}$/.test(t.name) ? t : { ...t, name: `track ${i + 1}` })))
    return encodeMrg({ leagues })
  }
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
}

const UNIT = 16384
const PHYSICS_MS = 20
const STUCK_MS = 10000
const OPTIONS = [[1, 0], [1, -1], [1, 1], [0, 0], [0, -1], [0, 1], [-1, 0], [-1, -1], [-1, 1]]
const IDLE = 3
const PLAN_STEP = 5
const PLAN_HORIZON = 24
const PLAN_CANDIDATES = 120
const LOADER_STATICS = ['visibleStartPointIndex', 'visibleEndPointIndex', 'visibleStartPointX', 'visibleEndPointX']

const slopeAt = (points, x) => {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (x >= x0 && x <= x1) return Math.atan2(y1 - y0, x1 - x0)
  }
  return 0
}

const bikeState = (physics) => {
  const front = physics.bikeParts[1].motoComponents[5]
  const rear = physics.bikeParts[2].motoComponents[5]
  const fx = front.xF16 / UNIT
  const fy = front.yF16 / UNIT
  const rx = rear.xF16 / UNIT
  const ry = rear.yF16 / UNIT
  return { x: Math.max(fx, rx), y: Math.min(fy, ry), midX: (fx + rx) / 2, pitch: Math.atan2(fy - ry, fx - rx) }
}

const drive = (physics, driver, points, inputs, step) => {
  if (driver === 'plan') physics.setInputDirection(...OPTIONS[inputs[step] ?? IDLE])
  if (driver === 'gas') physics.setInputDirection(1, 0)
  if (driver !== 'bot') return
  const s = bikeState(physics)
  const rel = s.pitch - slopeAt(points, s.midX)
  physics.setInputDirection(1, rel > 0.3 ? 1 : rel < -0.3 ? -1 : 0)
}

const createRun = (buffer, league, track) => {
  const levels = new LevelLoader(new FileStream(buffer))
  LevelLoader.isEnabledPerspective = true
  const physics = new GamePhysics(levels)
  physics.setMode(1)
  levels.loadLevel(league, track)
  physics.setMotoLeague(league)
  physics.syncRenderStateFromSimulation()
  return { levels, physics }
}

const run = (buffer, league, track, driver, points, inputs = []) => {
  const { physics } = createRun(buffer, league, track)
  if (driver === 'ai') physics.enableGenerateInputAI()
  const minY = Math.min(...points.map((p) => p[1]))
  let gameMs = 0
  let running = false
  let bestX = -Infinity
  let bestAt = 0
  for (let t = 0; t < limitMs; t += PHYSICS_MS) {
    drive(physics, driver, points, inputs, t / PHYSICS_MS)
    if (running) gameMs += PHYSICS_MS
    const code = physics.updatePhysics()
    physics.syncRenderStateFromSimulation()
    const s = bikeState(physics)
    const where = `x=${Math.round(s.x)} y=${Math.round(s.y)}`
    if (code === 1 || code === 2) return `finish ${((gameMs - (code === 2 ? 10 : 0)) / 1000).toFixed(2)}s`
    if (code === 3 || code === 5) return `crash(${code}) ${(t / 1000).toFixed(1)}s ${where}`
    if (s.y < minY - 100) return `fell ${(t / 1000).toFixed(1)}s ${where}`
    if (code === 4) { gameMs = 0; running = false } else running = true
    if (s.x > bestX + 5) { bestX = s.x; bestAt = t } else if (t - bestAt > STUCK_MS) return `stuck ${(t / 1000).toFixed(1)}s ${where}`
  }
  return `timeout ${limitMs / 1000}s`
}

const cloneDeep = (value, shared, memo = new Map()) => {
  if (value === null || typeof value !== 'object' || value === shared) return value
  if (memo.has(value)) return memo.get(value)
  const copy = Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value))
  memo.set(value, copy)
  for (const key of Object.keys(value)) copy[key] = cloneDeep(value[key], shared, memo)
  return copy
}

const snapshot = (physics, levels) => ({ physics: cloneDeep(physics, levels), statics: LOADER_STATICS.map((key) => LevelLoader[key]) })
const restore = (snap, levels) => {
  LOADER_STATICS.forEach((key, i) => { LevelLoader[key] = snap.statics[i] })
  return cloneDeep(snap.physics, levels)
}
const stepWith = (physics, option) => {
  physics.setInputDirection(...OPTIONS[option])
  const code = physics.updatePhysics()
  physics.syncRenderStateFromSimulation()
  return code
}
const score = (physics, sequence) => {
  for (let k = 0; k < sequence.length; k++) {
    for (let i = 0; i < PLAN_STEP; i++) {
      const code = stepWith(physics, sequence[k])
      const steps = k * PLAN_STEP + i
      if (code === 1 || code === 2) return 1e7 - steps
      if (code === 3 || code === 5) return -1e7 + steps * 10 + bikeState(physics).x
    }
  }
  return bikeState(physics).x
}
const planInputs = (buffer, league, track) => {
  const { levels, physics: first } = createRun(buffer, league, track)
  let physics = first
  let seed = 12345 + league * 100 + track
  const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff
  let previous = new Array(PLAN_HORIZON).fill(0)
  const inputs = []
  while (inputs.length * PHYSICS_MS < limitMs) {
    const base = snapshot(physics, levels)
    const shifted = [...previous.slice(1), previous[PLAN_HORIZON - 1]]
    const candidates = [shifted, new Array(PLAN_HORIZON).fill(0), new Array(PLAN_HORIZON).fill(1)]
    for (let n = 0; n < PLAN_CANDIDATES; n++) candidates.push(Array.from({ length: PLAN_HORIZON }, (_, i) => (n % 2 && random() < 0.7 ? shifted[i] : Math.floor(random() * OPTIONS.length))))
    let best = candidates[0]
    let bestScore = -Infinity
    for (const candidate of candidates) {
      const s = score(restore(base, levels), candidate)
      if (s > bestScore) { bestScore = s; best = candidate }
    }
    physics = restore(base, levels)
    for (let i = 0; i < PLAN_STEP; i++) {
      inputs.push(best[0])
      const code = stepWith(physics, best[0])
      if (code === 1 || code === 2 || code === 3 || code === 5) return inputs
    }
    previous = best
  }
  return inputs
}

const buffer = loadPack(file)
const pack = decodeMrg(buffer)
let finished = 0
let total = 0
pack.leagues.forEach((tracks, league) => {
  tracks.forEach((t, track) => {
    const result = (d) => `${d}: ${run(buffer, league, track, d, t.points, d === 'plan' ? planInputs(buffer, league, track) : [])}`
    const results = drivers.map(result)
    if (planFallback && !results.some((r) => r.includes(': finish'))) results.push(result('plan'))
    total += 1
    if (results.some((r) => r.includes(': finish'))) finished += 1
    console.log(`L${league} T${track} ${t.name.padEnd(12)} ${results.join(' | ')}`)
  })
})
console.log(`${finished}/${total} треків фінішують хоча б одним водієм`)
process.exitCode = finished === total ? 0 : 1
