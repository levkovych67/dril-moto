import { strings } from '../strings.uk.ts'
import type { Progress } from '../Progress.ts'
import { Screen, button, el, lockIcon } from './dom.ts'

export type TrackCounts = [number, number, number]

export interface LeaguesActions {
  open(league: number): void
  back(): void
}

/** Скільки треків ліги має рекорд (ключі поза поточною кількістю треків не рахуються). */
export const finishedIn = (p: Progress, league: number, total: number): number =>
  Object.keys(p.best).filter((key) => {
    const [l, t] = key.split('-').map(Number)
    return l === league && t < total
  }).length

export class LeaguesScreen extends Screen {
  private readonly getProgress: () => Progress
  private readonly counts: () => TrackCounts
  private readonly a: LeaguesActions

  constructor(getProgress: () => Progress, counts: () => TrackCounts, a: LeaguesActions) {
    super('leagues')
    this.getProgress = getProgress
    this.counts = counts
    this.a = a
  }

  render(): void {
    const p = this.getProgress()
    const counts = this.counts()
    this.root.append(el('h2', 'heading', strings.leagues.heading))
    strings.leagues.names.forEach((name, league) => {
      const total = counts[league]
      const unlocked = total > 0 && p.unlockedTracks[league] > 0
      const card = button(name, unlocked ? 'card' : 'card card-locked', () => this.a.open(league))
      const done = strings.leagues.progress(finishedIn(p, league, total), total)
      const hint = el('span', 'card-hint', unlocked ? done : `${done} · ${this.lockedHint(p, counts, league)}`)
      if (!unlocked) hint.prepend(lockIcon())
      card.append(hint)
      card.disabled = !unlocked
      this.root.append(card)
    })
    this.root.append(button(strings.leagues.back, 'btn btn-ghost', () => this.a.back()))
  }

  /** Підпис закритої ліги: скільки треків лишилось у попередній. Для ліги 0 чи порожньої — «Закрито». */
  private lockedHint(p: Progress, counts: TrackCounts, league: number): string {
    if (league === 0 || counts[league] === 0) return strings.tracks.locked
    const prev = league - 1
    const left = Math.max(0, counts[prev] - finishedIn(p, prev, counts[prev]))
    return strings.leagues.locked(left, strings.leagues.names[prev])
  }
}
