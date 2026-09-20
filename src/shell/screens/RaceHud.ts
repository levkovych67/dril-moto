// src/shell/screens/RaceHud.ts — DOM-HUD заїзду: назва треку ліворуч, секундомір і
// пауза праворуч угорі, підпис падіння по центру. Секунди відліку приходять із
// RaceLoop.onCrashCountdown, тож текст збігається з рестартом і стоїть у паузі.
import { strings } from '../strings.uk.ts'
import { formatTime } from '../RaceLoop.ts'
import { button, el } from './dom.ts'

export class RaceHud {
  readonly root = el('div', 'hud')
  private readonly name = el('span', 'hud-name')
  private readonly time = el('span', 'hud-time', formatTime(0))
  private readonly notice = el('div', 'hud-notice')

  constructor(onPause: () => void) {
    const bar = el('div', 'hud-bar')
    const pause = button(strings.race.pause, 'btn btn-hud', onPause)
    // click не приходить від другого пальця (не-primary pointer), поки перший тримає ГАЗ
    pause.addEventListener('pointerup', (e) => {
      if (!e.isPrimary) onPause()
    })
    bar.append(this.name, this.time, pause)
    this.root.append(bar, this.notice)
    this.root.hidden = true
    this.notice.hidden = true
  }

  setTrack(name: string): void {
    this.name.textContent = name
  }

  setTime(ms: number): void {
    this.time.textContent = formatTime(ms)
  }

  showCrash(secondsLeft: number): void {
    this.notice.textContent = `${strings.race.crashed}. ${strings.race.restartIn(secondsLeft)} ${strings.race.tapToRestart}`
    this.notice.hidden = false
  }

  clearNotice(): void {
    this.notice.hidden = true
  }
}
