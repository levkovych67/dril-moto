// src/shell/FpsMeter.ts — лічильник кадрів для ?debug: раз на секунду пише «NN fps» у HUD.
import { strings } from './strings.uk.ts'
import { el } from './screens/dom.ts'

export class FpsMeter {
  readonly root = el('div', 'hud-fps')
  private frames = 0
  private since = -1

  /** Кличеться на кожному кадрі заїзду (RaceLoop.onTick). */
  tick(now: number): void {
    if (this.since < 0) this.since = now
    this.frames += 1
    const elapsed = now - this.since
    if (elapsed < 1000) return
    this.root.textContent = strings.race.fps(Math.round((this.frames * 1000) / elapsed))
    this.frames = 0
    this.since = now
  }

  /** Після паузи чи старту відлік з нуля: час без кадрів не рахується. */
  reset(): void {
    this.frames = 0
    this.since = -1
  }
}
