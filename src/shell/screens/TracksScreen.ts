import { strings } from '../strings.uk.ts'
import { bestKey, isTrackUnlocked, type Progress } from '../Progress.ts'
import { formatTime } from '../RaceLoop.ts'
import { Screen, button, el, lockIcon } from './dom.ts'

export interface TracksActions {
  start(league: number, track: number): void
  back(): void
}

export class TracksScreen extends Screen {
  league = 0
  private readonly getProgress: () => Progress
  private readonly names: () => string[][]
  private readonly a: TracksActions

  constructor(getProgress: () => Progress, names: () => string[][], a: TracksActions) {
    super('tracks')
    this.getProgress = getProgress
    this.names = names
    this.a = a
  }

  render(): void {
    const p = this.getProgress()
    const league = this.league
    this.root.append(el('h2', 'heading', strings.tracks.heading(strings.leagues.names[league])))
    const names = this.names()[league] ?? []
    names.forEach((name, track) => {
      const unlocked = isTrackUnlocked(p, league, track)
      const row = button(`${track + 1}. ${name}`, unlocked ? 'row' : 'row row-locked', () => this.a.start(league, track))
      const best = p.best[bestKey(league, track)]
      const text = unlocked ? (best === undefined ? strings.tracks.noBest : formatTime(best)) : strings.tracks.locked
      const hint = el('span', 'row-hint', text)
      if (!unlocked) hint.prepend(lockIcon())
      row.append(hint)
      row.disabled = !unlocked
      this.root.append(row)
    })
    this.root.append(button(strings.tracks.back, 'btn btn-ghost', () => this.a.back()))
  }
}
