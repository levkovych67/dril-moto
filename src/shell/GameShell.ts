// src/shell/GameShell.ts — склеює двигун, цикл заїзду, ввід і DOM-шар.
import { createEngine, type Engine } from './engine.ts'
import { RaceLoop, formatTime } from './RaceLoop.ts'
import { bindKeyboard } from './keyboard.ts'
import DEV_PACK_URL from '../assets/dev-pack.mrg?url'

export class GameShell {
  private engine!: Engine
  private race!: RaceLoop
  private hud!: HTMLDivElement

  async start(root: HTMLElement): Promise<void> {
    root.replaceChildren()
    const stage = document.createElement('div')
    stage.className = 'stage'
    const canvas = document.createElement('canvas')
    canvas.className = 'game-canvas'
    this.hud = document.createElement('div')
    this.hud.className = 'hud'
    stage.append(canvas, this.hud)
    root.append(stage)

    const pack = await (await fetch(DEV_PACK_URL)).arrayBuffer()
    this.engine = await createEngine(canvas, pack)
    this.race = new RaceLoop(this.engine, {
      onTick: (ms) => {
        if (!this.race.crashed) this.hud.textContent = formatTime(ms)
      },
      onCrash: () => undefined,
      onCrashCountdown: (s) => {
        this.hud.textContent = `падіння — ще раз через ${s}…`
      },
      onFinish: (ms) => {
        this.hud.textContent = `фініш ${formatTime(ms)} — Enter: ще раз`
      },
      onRestart: () => undefined,
    })
    new ResizeObserver(() => {
      this.engine.resize()
      this.engine.render()
    }).observe(stage)
    bindKeyboard({
      isRacing: () => this.race.running && !this.race.paused,
      isPaused: () => this.race.paused,
      press: (code) => this.engine.canvas.keyPressed(code),
      release: (code) => this.engine.canvas.keyReleased(code),
      releaseAll: () => {
        this.engine.canvas.resetInputState()
        this.engine.canvas.handleUpdatedInput()
      },
      pause: () => this.race.pause(),
      resume: () => this.race.resume(),
    })
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) {
        e.preventDefault()
        this.race.start(0, 0)
      }
    })
    canvas.addEventListener('pointerdown', () => {
      if (this.race.crashed) this.race.restart()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.race.pause()
    })
    this.race.start(0, 0)
  }
}
