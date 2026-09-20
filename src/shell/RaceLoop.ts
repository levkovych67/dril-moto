// src/shell/RaceLoop.ts — цикл заїзду з app.ts порту без меню.
import type { Engine } from './engine.ts'

export interface RaceEvents {
  onTick(gameTimeMs: number): void
  onCrash(): void
  onCrashCountdown(secondsLeft: number): void
  onFinish(timeMs: number): void
  onRestart(): void
}

const OUTER_STEP_MS = 30
const GAME_MS_PER_PHYSICS_LOOP = 20
const GOAL_STEPS = Math.floor(1000 / OUTER_STEP_MS)
const CRASH_STEPS = 3000 / OUTER_STEP_MS
const MAX_FRAME_MS = 100

export const formatTime = (ms: number): string => {
  const hundredths = Math.max(0, Math.floor(ms / 10))
  const minutes = Math.floor(hundredths / 6000)
  const seconds = Math.floor((hundredths % 6000) / 100)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`
}

export class RaceLoop {
  private readonly engine: Engine
  private readonly events: RaceEvents
  private raf = 0
  private lastFrameMs = -1
  private accumulatorMs = 0
  private isRunning = false
  private isPaused = false
  private goalStepsLeft = 0
  private crashStepsLeft = 0
  private crashSecondsShown = 0
  private isFrozen = false

  constructor(engine: Engine, events: RaceEvents) {
    this.engine = engine
    this.events = events
  }

  get running(): boolean {
    return this.isRunning
  }

  get paused(): boolean {
    return this.isPaused
  }

  get crashed(): boolean {
    return this.crashStepsLeft > 0
  }

  start(league: number, track: number): void {
    const { physics, levels } = this.engine
    this.stop()
    physics.disableGenerateInputAI()
    levels.loadLevel(league, track)
    physics.setMotoLeague(league)
    this.reset()
    this.isRunning = true
    this.schedule()
  }

  restart(): void {
    if (!this.isRunning) return
    this.reset()
    this.events.onRestart()
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return
    this.isPaused = true
    cancelAnimationFrame(this.raf)
    this.releaseInput()
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) return
    this.isPaused = false
    this.releaseInput()
    this.schedule()
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.isRunning = false
    this.isPaused = false
    this.releaseInput()
  }

  private schedule(): void {
    this.lastFrameMs = -1
    this.accumulatorMs = 0
    this.raf = requestAnimationFrame(this.loop)
  }

  private releaseInput(): void {
    this.engine.canvas.resetInputState()
    this.engine.canvas.handleUpdatedInput()
  }

  private reset(): void {
    const { physics, micro } = this.engine
    physics.resetSmth(true)
    physics.syncRenderStateFromSimulation()
    micro.timeMs = 0
    micro.gameTimeMs = 0
    micro.crashRestartDeadlineMs = 0
    micro.isTimerRunning = false
    this.goalStepsLeft = 0
    this.crashStepsLeft = 0
    this.crashSecondsShown = 0
    this.isFrozen = false
  }

  private beginCrash(): void {
    if (this.crashStepsLeft > 0) return
    this.crashStepsLeft = CRASH_STEPS
    this.crashSecondsShown = 0
    this.events.onCrash()
    this.reportCountdown()
  }

  private reportCountdown(): void {
    const seconds = Math.ceil((this.crashStepsLeft * OUTER_STEP_MS) / 1000)
    if (seconds !== this.crashSecondsShown) {
      this.crashSecondsShown = seconds
      this.events.onCrashCountdown(seconds)
    }
  }

  private finish(): void {
    this.goalStepsLeft = 0
    this.isRunning = false
    cancelAnimationFrame(this.raf)
    this.events.onFinish(this.engine.micro.gameTimeMs)
  }

  private goalStep(): void {
    const { physics, micro } = this.engine
    for (let i = micro.numPhysicsLoops; i > 0; --i) {
      if (physics.updatePhysics() === 5) {
        this.finish()
        return
      }
    }
    physics.syncRenderStateFromSimulation()
    this.goalStepsLeft -= 1
    if (this.goalStepsLeft === 0) this.finish()
  }

  private outerStep(): void {
    if (this.goalStepsLeft > 0) {
      this.goalStep()
      return
    }
    if (this.crashStepsLeft > 0) {
      this.crashStepsLeft -= 1
      if (this.crashStepsLeft === 0) {
        this.restart()
        return
      }
      this.reportCountdown()
      if (this.isFrozen) return
    }
    const { physics, micro } = this.engine
    for (let i = micro.numPhysicsLoops; i > 0; --i) {
      if (micro.isTimerRunning) micro.gameTimeMs += GAME_MS_PER_PHYSICS_LOOP
      const code = physics.updatePhysics()
      if (code === 3 || code === 5) {
        this.beginCrash()
        if (code === 5) {
          this.isFrozen = true
          return
        }
      } else if (code === 4) {
        micro.gameTimeMs = 0
      } else if (code === 1 || code === 2) {
        if (code === 2) micro.gameTimeMs -= 10
        micro.isTimerRunning = true
        this.goalStepsLeft = GOAL_STEPS
        return
      }
      micro.isTimerRunning = code !== 4
    }
    physics.syncRenderStateFromSimulation()
  }

  private readonly loop = (now: number): void => {
    if (!this.isRunning || this.isPaused) return
    if (this.lastFrameMs < 0) this.lastFrameMs = now
    this.accumulatorMs += Math.min(now - this.lastFrameMs, MAX_FRAME_MS)
    this.lastFrameMs = now
    while (this.isRunning && this.accumulatorMs >= OUTER_STEP_MS) {
      this.accumulatorMs -= OUTER_STEP_MS
      this.outerStep()
    }
    this.engine.render()
    if (!this.isRunning) return
    this.events.onTick(this.engine.micro.gameTimeMs)
    this.raf = requestAnimationFrame(this.loop)
  }
}
