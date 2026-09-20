// src/shell/screens/RecordsScreen.ts — найкращі часи по лігах і скидання прогресу
// з підтвердженням у тому ж екрані. У підтвердженні фокус на «Лишити»: випадковий
// Enter нічого не стирає.
import { strings } from '../strings.uk.ts'
import { bestKey, type Progress } from '../Progress.ts'
import { formatTime } from '../RaceLoop.ts'
import { Screen, button, el } from './dom.ts'

export interface RecordsActions {
  reset(): void
  back(): void
}

export class RecordsScreen extends Screen {
  private readonly getProgress: () => Progress
  private readonly names: () => string[][]
  private readonly a: RecordsActions
  private confirming = false

  constructor(getProgress: () => Progress, names: () => string[][], a: RecordsActions) {
    super('records')
    this.getProgress = getProgress
    this.names = names
    this.a = a
  }

  render(): void {
    this.root.append(el('h2', 'heading', strings.records.heading), this.table())
    if (this.confirming) {
      this.root.append(
        el('p', 'confirm', strings.records.confirm),
        button(strings.records.no, 'btn btn-primary', () => this.confirm(false)),
        button(strings.records.yes, 'btn', () => {
          this.a.reset()
          this.confirm(false)
        }),
      )
    } else {
      this.root.append(button(strings.records.reset, 'btn', () => this.confirm(true)))
    }
    this.root.append(button(strings.records.back, 'btn btn-ghost', () => this.a.back()))
  }

  hide(): void {
    this.confirming = false
    super.hide()
  }

  private confirm(on: boolean): void {
    this.confirming = on
    this.show()
  }

  private table(): HTMLTableElement {
    const p = this.getProgress()
    const table = el('table', 'records')
    this.names().forEach((tracks, league) => {
      if (tracks.length === 0) return
      const head = el('tr')
      const th = el('th', '', strings.leagues.names[league])
      th.colSpan = 2
      head.append(th)
      table.append(head)
      tracks.forEach((name, track) => {
        const best = p.best[bestKey(league, track)]
        const row = el('tr')
        const time = best === undefined ? strings.tracks.noBest : formatTime(best)
        row.append(el('td', '', `${track + 1}. ${name}`), el('td', 'records-time', time))
        table.append(row)
      })
    })
    return table
  }
}
