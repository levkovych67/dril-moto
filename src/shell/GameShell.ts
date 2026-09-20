// src/shell/GameShell.ts — стан-машина екранів: вантажить пак, збирає двигун, веде
// прогрес і перемикає DOM-екрани (screens/menus.ts). Усе, що живе під час заїзду
// (цикл, HUD, ввід), — у RaceSession. Канвас лише для заїзду, меню — DOM.
import DEV_PACK_URL from '../assets/dev-pack.mrg?url'
import { createEngine } from './engine.ts'
import { decodeMrg } from './mrg.ts'
import { bestKey, emptyProgress, isTrackUnlocked, loadProgress, recordFinish, saveProgress, type Progress } from './Progress.ts'
import { RaceSession } from './RaceSession.ts'
import { el } from './screens/dom.ts'
import type { TrackCounts } from './screens/LeaguesScreen.ts'
import { createMenus, type MenuId, type Menus } from './screens/menus.ts'

export type ScreenId = MenuId | 'race'

// Префікс ключів localStorage; у Task 10 приходить з ?ns=
const NS = 'dril-moto'

export class GameShell {
  private session!: RaceSession
  private menus!: Menus
  private progress: Progress = emptyProgress()
  private names: string[][] = [[], [], []]
  private counts: TrackCounts = [0, 0, 0]
  private screen: ScreenId = 'splash'

  async start(root: HTMLElement): Promise<void> {
    root.replaceChildren()
    const stage = el('div', 'stage')
    const canvas = el('canvas', 'game-canvas')
    stage.append(canvas)
    root.append(stage)

    const buffer = await (await fetch(DEV_PACK_URL)).arrayBuffer()
    // decodeMrg лише читає буфер: той самий буфер далі йде в LevelLoader; '_' двигун показує пробілом
    this.names = decodeMrg(buffer).leagues.map((l) => l.map((t) => t.name.replaceAll('_', ' ')))
    this.counts = [this.names[0].length, this.names[1].length, this.names[2].length]
    this.progress = loadProgress(NS)
    const engine = await createEngine(canvas, buffer)
    this.session = new RaceSession(engine, {
      onPaused: () => this.go('pause'),
      onResumeRequest: () => this.resume(),
      onFinish: (league, track, timeMs) => this.finish(league, track, timeMs),
    })
    this.menus = createMenus({
      progress: () => this.progress,
      trackNames: () => this.names,
      trackCounts: () => this.counts,
      go: (id) => this.go(id),
      openTracks: (league) => this.openTracks(league),
      startTrack: (league, track) => this.startTrack(league, track),
      startNext: () => this.startNext(),
      retry: () => this.startTrack(this.session.league, this.session.track),
      resume: () => this.resume(),
      restart: () => this.restart(),
      toTracks: () => this.toTracks(),
      exit: () => this.exitGame(),
    })
    this.session.mount(stage, canvas)
    stage.append(...Object.values(this.menus.screens).map((s) => s.root))
    new ResizeObserver(() => {
      engine.resize()
      engine.render()
    }).observe(stage)
    this.go('splash')
  }

  private go(id: ScreenId): void {
    this.screen = id
    for (const [key, screen] of Object.entries(this.menus.screens)) if (key !== id) screen.hide()
    this.session.show(id === 'race')
    if (id !== 'race') this.menus.screens[id].show()
  }

  private openTracks(league: number): void {
    this.menus.tracks.league = league
    this.go('tracks')
  }

  private startTrack(league: number, track: number): void {
    this.session.start(league, track, this.names[league][track] ?? '')
    this.go('race')
  }

  private resume(): void {
    if (this.screen !== 'pause') return
    this.go('race')
    this.session.resume()
  }

  /** «Заново» з паузи: той самий трек з нуля, пауза знімається. */
  private restart(): void {
    this.session.restart()
    this.resume()
  }

  /** «До треків» з паузи або фінішу: цикл заїзду зупиняється. */
  private toTracks(): void {
    this.session.stop()
    this.openTracks(this.session.league)
  }

  /** «Вийти» з меню чи паузи. Task 10: сайт закриває гру через bridge.exit(). */
  private exitGame(): void {
    this.session.stop()
    this.go('main')
    console.log('exit')
  }

  private finish(league: number, track: number, timeMs: number): void {
    const prevBestMs: number | undefined = this.progress.best[bestKey(league, track)]
    const r = recordFinish(this.progress, league, track, timeMs, this.counts)
    this.progress = r.progress
    saveProgress(NS, this.progress)
    const canNext = this.nextTrack() !== null
    this.menus.finish.result = { timeMs, prevBestMs, isBest: r.isBest, canNext, leagueUnlocked: r.unlockedNextLeague }
    this.go('finish')
  }

  /** Наступний відкритий трек: далі в тій самій лізі, інакше перший трек наступної. */
  private nextTrack(): [number, number] | null {
    const { league, track } = this.session
    if (track + 1 < this.counts[league]) return isTrackUnlocked(this.progress, league, track + 1) ? [league, track + 1] : null
    const next = league + 1
    return next < 3 && this.counts[next] > 0 && isTrackUnlocked(this.progress, next, 0) ? [next, 0] : null
  }

  private startNext(): void {
    const next = this.nextTrack()
    if (next !== null) this.startTrack(next[0], next[1])
  }
}
