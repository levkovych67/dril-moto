// src/shell/screens/FinishScreen.ts — результат заїзду поверх останнього кадру.
// GameShell записує result перед go('finish'); «Далі» є лише коли відкрито наступний трек.
import { strings } from '../strings.uk.ts'
import { formatTime } from '../RaceLoop.ts'
import { Screen, button, el } from './dom.ts'

export interface FinishResult {
  timeMs: number
  /** Рекорд до цього заїзду; undefined — трек пройдено вперше. */
  prevBestMs: number | undefined
  isBest: boolean
  canNext: boolean
  leagueUnlocked: boolean
}

export interface FinishActions {
  next(): void
  restart(): void
  tracks(): void
}

export class FinishScreen extends Screen {
  result: FinishResult = { timeMs: 0, prevBestMs: undefined, isBest: false, canNext: false, leagueUnlocked: false }
  private readonly a: FinishActions

  constructor(a: FinishActions) {
    super('finish')
    this.a = a
  }

  render(): void {
    const r = this.result
    this.root.append(
      el('h2', 'heading', strings.finish.heading),
      el('p', 'finish-time', `${strings.finish.time}: ${formatTime(r.timeMs)}`),
    )
    if (r.prevBestMs !== undefined) {
      this.root.append(el('p', 'finish-best', `${strings.finish.prevBest}: ${formatTime(r.prevBestMs)}`))
    }
    if (r.isBest) this.root.append(el('p', 'badge', strings.finish.newBest))
    if (r.leagueUnlocked) this.root.append(el('p', 'finish-note', strings.finish.leagueUnlocked))
    if (r.canNext) this.root.append(button(strings.finish.next, 'btn btn-primary', () => this.a.next()))
    this.root.append(
      button(strings.finish.restart, r.canNext ? 'btn' : 'btn btn-primary', () => this.a.restart()),
      button(strings.finish.tracks, 'btn btn-ghost', () => this.a.tracks()),
    )
  }
}
