import assert from 'node:assert/strict'
import { RaceLoop, formatTime } from '../src/shell/RaceLoop.ts'

const originalRaf = globalThis.requestAnimationFrame
const originalCancelRaf = globalThis.cancelAnimationFrame

class Scheduler {
  nextId = 1
  callbacks = new Map()

  install() {
    globalThis.requestAnimationFrame = (callback) => {
      const id = this.nextId++
      this.callbacks.set(id, callback)
      return id
    }
    globalThis.cancelAnimationFrame = (id) => this.callbacks.delete(id)
  }

  frame(now) {
    const entry = this.callbacks.entries().next().value
    assert.ok(entry, 'a frame must be scheduled')
    const [id, callback] = entry
    this.callbacks.delete(id)
    callback(now)
  }
}

const createHarness = (codes = []) => {
  const scheduler = new Scheduler()
  scheduler.install()
  const calls = {
    disableAI: 0,
    inputRelease: 0,
    loads: [],
    leagues: [],
    physics: 0,
    resets: 0,
    renders: 0,
    syncs: 0,
  }
  const micro = {
    numPhysicsLoops: 2,
    timeMs: 0,
    gameTimeMs: 0,
    crashRestartDeadlineMs: 0,
    isTimerRunning: false,
  }
  const physics = {
    disableGenerateInputAI: () => { calls.disableAI += 1 },
    setMotoLeague: (league) => { calls.leagues.push(league) },
    resetSmth: () => { calls.resets += 1 },
    syncRenderStateFromSimulation: () => { calls.syncs += 1 },
    updatePhysics: () => {
      calls.physics += 1
      return codes.shift() ?? 0
    },
  }
  const canvas = {
    resetInputState: () => { calls.inputRelease += 1 },
    handleUpdatedInput: () => undefined,
  }
  const levels = { loadLevel: (league, track) => { calls.loads.push([league, track]) } }
  const events = { ticks: [], crashes: 0, countdowns: [], finishes: [], restarts: 0 }
  const loop = new RaceLoop({ micro, physics, canvas, levels, render: () => { calls.renders += 1 } }, {
    onTick: (time) => events.ticks.push(time),
    onCrash: () => { events.crashes += 1 },
    onCrashCountdown: (seconds) => events.countdowns.push(seconds),
    onFinish: (time) => events.finishes.push(time),
    onRestart: () => { events.restarts += 1 },
  })
  return { calls, events, loop, micro, scheduler }
}

const runOuterSteps = (scheduler, count, startAt = 0) => {
  scheduler.frame(startAt)
  for (let step = 1; step <= count; step += 1) scheduler.frame(startAt + step * 30)
}

try {
  assert.deepEqual([
    formatTime(0), formatTime(7980), formatTime(12070), formatTime(65300), formatTime(600000),
  ], ['0:00.00', '0:07.98', '0:12.07', '1:05.30', '10:00.00'])

  {
    const { calls, loop, micro, scheduler } = createHarness([4, 4, 0, 0])
    loop.start(2, 7)
    runOuterSteps(scheduler, 1)
    assert.equal(micro.gameTimeMs, 0, 'code 4 holds the displayed clock at zero')
    scheduler.frame(60)
    assert.equal(calls.physics, 4, 'each outer step runs two physics loops')
    assert.equal(micro.gameTimeMs, 20, 'the running clock advances in 20 ms physics increments')
  }

  {
    const { calls, loop, scheduler } = createHarness()
    loop.start(0, 0)
    scheduler.frame(0)
    scheduler.frame(1000)
    assert.equal(calls.physics, 6, 'a long frame is capped at three fixed outer steps')
  }

  {
    const { calls, events, loop, micro, scheduler } = createHarness([3])
    loop.start(0, 0)
    runOuterSteps(scheduler, 1)
    const clockBeforePause = micro.gameTimeMs
    const physicsBeforePause = calls.physics
    const countdownBeforePause = [...events.countdowns]
    loop.pause()
    assert.equal(loop.paused, true)
    assert.equal(calls.inputRelease, 2, 'start and pause both release input')
    assert.equal(scheduler.callbacks.size, 0, 'pause cancels pending work')
    loop.resume()
    scheduler.frame(30000)
    assert.equal(micro.gameTimeMs, clockBeforePause, 'resume ignores a long wall-time gap')
    assert.deepEqual(events.countdowns, countdownBeforePause, 'pause freezes the crash countdown')
    scheduler.frame(30030)
    assert.equal(calls.physics, physicsBeforePause + 2, 'work resumes only on new fixed steps')
  }

  for (const crashCode of [3, 5]) {
    const { calls, events, loop, scheduler } = createHarness([crashCode])
    loop.start(1, 4)
    runOuterSteps(scheduler, 1)
    assert.equal(loop.crashed, true)
    assert.equal(events.crashes, 1)
    for (let step = 1; step <= 99; step += 1) scheduler.frame(30 + step * 30)
    assert.equal(events.restarts, 0, `code ${crashCode} does not restart before 100 countdown steps`)
    scheduler.frame(3030)
    assert.deepEqual(events.countdowns, [3, 2, 1], `code ${crashCode} reports 3, 2, 1`)
    assert.equal(events.restarts, 1, `code ${crashCode} restarts once after its 100 countdown steps`)
    if (crashCode === 5) assert.equal(calls.physics, 1, 'code 5 freezes physics while the countdown advances')
  }

  for (const finishCode of [1, 2]) {
    const { events, loop, micro, scheduler } = createHarness([0, finishCode])
    loop.start(0, 0)
    runOuterSteps(scheduler, 1)
    const expected = finishCode === 2 ? 10 : 20
    assert.equal(micro.gameTimeMs, expected, `code ${finishCode} applies its finish clock correction`)
    for (let step = 1; step <= 32; step += 1) scheduler.frame(30 + step * 30)
    assert.equal(loop.running, true, 'the goal loop waits for its final step')
    scheduler.frame(1020)
    assert.equal(loop.running, false)
    assert.deepEqual(events.finishes, [expected], 'finish fires once after the goal loop')
  }

  {
    const { events, loop, scheduler } = createHarness([0, 1, 5])
    loop.start(0, 0)
    runOuterSteps(scheduler, 1)
    scheduler.frame(60)
    assert.equal(loop.running, false, 'code 5 ends the goal loop early')
    assert.equal(events.finishes.length, 1)
  }

  {
    const { calls, loop, scheduler } = createHarness()
    loop.start(0, 0)
    loop.start(1, 2)
    runOuterSteps(scheduler, 1)
    const physicsBeforeStop = calls.physics
    loop.stop()
    assert.equal(loop.running, false)
    assert.equal(scheduler.callbacks.size, 0)
    assert.deepEqual(calls.loads, [[0, 0], [1, 2]])
    assert.deepEqual(calls.leagues, [0, 1])
    assert.equal(calls.physics, physicsBeforeStop, 'stop permits no later physics work')
  }

  console.log('RaceLoop lifecycle checks passed')
} finally {
  globalThis.requestAnimationFrame = originalRaf
  globalThis.cancelAnimationFrame = originalCancelRaf
}
