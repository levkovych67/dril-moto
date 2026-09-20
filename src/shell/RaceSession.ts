// src/shell/RaceSession.ts — усе, що живе під час заїзду: цикл RaceLoop, DOM-HUD,
// клавіатура, тап-рестарт після падіння і пауза при прихованій вкладці. Екранами
// меню не керує: про паузу й фініш повідомляє GameShell через RaceSessionEvents.
import type { Engine } from './engine.ts'
import { bindKeyboard } from './keyboard.ts'
import { RaceLoop } from './RaceLoop.ts'
import { RaceHud } from './screens/RaceHud.ts'

export interface RaceSessionEvents {
  /** Заїзд став на паузу (кнопка HUD, Escape, прихована вкладка) — показати екран паузи. */
  onPaused(): void
  /** Escape на екрані паузи — продовжити. */
  onResumeRequest(): void
  onFinish(league: number, track: number, timeMs: number): void
}

export class RaceSession {
  league = 0
  track = 0
  private readonly engine: Engine
  private readonly events: RaceSessionEvents
  private readonly hud: RaceHud
  private readonly race: RaceLoop
  private visible = false

  constructor(engine: Engine, events: RaceSessionEvents) {
    this.engine = engine
    this.events = events
    this.hud = new RaceHud(() => this.pause())
    this.race = new RaceLoop(engine, {
      onTick: (ms) => this.hud.setTime(ms),
      onCrash: () => undefined,
      onCrashCountdown: (seconds) => this.hud.showCrash(seconds),
      onFinish: (ms) => this.events.onFinish(this.league, this.track, ms),
      onRestart: () => {
        this.hud.clearNotice()
        this.hud.setTime(0)
      },
    })
  }

  /** Їде зараз: екран заїзду показаний, цикл іде, не пауза. */
  get racing(): boolean {
    return this.visible && this.race.running && !this.race.paused
  }

  /** HUD — у stage над канвасом; клавіатура, тап по канвасу, пауза при прихованій вкладці. */
  mount(stage: HTMLElement, canvas: HTMLCanvasElement): void {
    stage.append(this.hud.root)
    bindKeyboard({
      isRacing: () => this.racing,
      isPaused: () => this.race.paused,
      press: (code) => this.engine.canvas.keyPressed(code),
      release: (code) => this.engine.canvas.keyReleased(code),
      releaseAll: () => this.releaseAll(),
      pause: () => this.pause(),
      resume: () => this.events.onResumeRequest(),
    })
    // .hud прозорий для дотиків (крім кнопки паузи), тож тап по екрану доходить до канвасу
    canvas.addEventListener('pointerdown', () => {
      if (this.racing && this.race.crashed) this.race.restart()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause()
    })
  }

  /** HUD видно лише на екрані заїзду. */
  show(visible: boolean): void {
    this.visible = visible
    this.hud.root.hidden = !visible
  }

  start(league: number, track: number, name: string): void {
    this.league = league
    this.track = track
    this.hud.clearNotice()
    this.hud.setTrack(name)
    this.hud.setTime(0)
    this.race.start(league, track)
  }

  pause(): void {
    if (!this.racing) return
    this.race.pause()
    this.events.onPaused()
  }

  resume(): void {
    this.race.resume()
  }

  /** Той самий трек з нуля; пауза лишається, доки GameShell не викличе resume(). */
  restart(): void {
    this.race.restart()
  }

  stop(): void {
    this.race.stop()
    this.hud.clearNotice()
  }

  /** Вікно втратило фокус: keyup туди не прийде, тож відпускаємо все й доносимо нуль до фізики. */
  private releaseAll(): void {
    this.engine.canvas.resetInputState()
    this.engine.canvas.handleUpdatedInput()
  }
}
