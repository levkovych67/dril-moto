// src/shell/GameShell.ts — стан-машина екранів: читає конфіг з URL, вантажить пак,
// збирає двигун, веде прогрес, перемикає DOM-екрани (screens/menus.ts) і говорить із
// сайтом (bridge.ts). Усе, що живе під час заїзду (цикл, HUD, ввід), — у RaceSession.
import { bridge } from './bridge.ts'
import { readConfig, type Config } from './config.ts'
import { createEngine } from './engine.ts'
import { loadPack } from './pack.ts'
import { bestKey, emptyProgress, isTrackUnlocked, loadProgress, recordFinish, resetProgress, saveProgress, type Progress } from './Progress.ts'
import { RaceSession } from './RaceSession.ts'
import { el } from './screens/dom.ts'
import type { TrackCounts } from './screens/LeaguesScreen.ts'
import { createMenus, type MenuId, type Menus } from './screens/menus.ts'

export type ScreenId = MenuId | 'race'

const VERSION: string = import.meta.env.VITE_APP_VERSION ?? 'dev'

/**
 * Чекає, поки браузер покаже сплеш-заглушку з index.html, і лише тоді гра береться
 * за пак, шрифти й двигун. Без LCP API (Safari) — перший кадр (paint); не довше
 * BOOT_WAIT_MS.
 */
const BOOT_WAIT_MS = 500
const bootPainted = (): Promise<void> =>
  new Promise((resolve) => {
    const type = PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint') ? 'largest-contentful-paint' : 'paint'
    const observer = new PerformanceObserver(() => {
      observer.disconnect()
      resolve()
    })
    observer.observe({ type, buffered: true })
    window.setTimeout(() => {
      observer.disconnect()
      resolve()
    }, BOOT_WAIT_MS)
  })

export class GameShell {
  private cfg!: Config
  private ns = ''
  private session!: RaceSession
  private menus!: Menus
  private progress: Progress = emptyProgress()
  private names: string[][] = [[], [], []]
  private counts: TrackCounts = [0, 0, 0]
  private screen: ScreenId = 'splash'

  async start(root: HTMLElement): Promise<void> {
    this.cfg = readConfig()
    // пробні треки з ?debug&json= пишуть прогрес окремо й не чіпають справжній
    this.ns = this.cfg.jsonUrl ? `${this.cfg.ns}:json` : this.cfg.ns
    // iframe не бачить data-theme сайту: тема приходить параметром (spec, секція 1)
    document.documentElement.dataset.theme = this.cfg.theme
    // Сплеш-заглушка з index.html лишається на екрані, доки не готовий справжній сплеш.
    const boot = root.querySelector('[data-screen="boot"]')
    await bootPainted()
    const stage = el('div', 'stage')
    stage.hidden = true // до справжнього сплешу видно лише заглушку
    const canvas = el('canvas', 'game-canvas')
    stage.append(canvas)
    root.append(stage)

    // До першого кадру меню чекаємо 700 для заголовків і 500 для кнопок та HUD.
    const fonts = Promise.all([
      document.fonts.load('700 32px e-Ukraine'),
      document.fonts.load('500 16px e-Ukraine'),
    ]).catch(() => [])
    const [pack] = await Promise.all([loadPack(this.cfg), fonts])
    this.names = pack.names
    this.counts = [pack.names[0].length, pack.names[1].length, pack.names[2].length]
    this.progress = loadProgress(this.ns)
    const engine = await createEngine(canvas, pack.buffer)
    this.session = new RaceSession(
      engine,
      {
        onPaused: () => this.go('pause'),
        onResumeRequest: () => this.resume(),
        onFinish: (league, track, timeMs) => this.finish(league, track, timeMs),
      },
      this.cfg.debug,
    )
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
      resetProgress: () => {
        resetProgress(this.ns)
        this.progress = emptyProgress()
      },
      exit: () => this.exitGame(),
    })
    this.session.mount(stage, canvas)
    stage.append(...Object.values(this.menus.screens).map((s) => s.root))
    new ResizeObserver(() => {
      engine.resize()
      engine.render()
    }).observe(stage)
    stage.hidden = false
    // ?debug&json= одразу запускає заїзд (spec, «Авторинг»); інакше сплеш → меню
    if (this.cfg.jsonUrl) this.startTrack(0, 0)
    else this.go('splash')
    // Після першого кадру з грою сайт знімає скелетон і догружається Regular для тексту.
    requestAnimationFrame(() => {
      bridge.ready(VERSION)
      boot?.remove()
      document.fonts.load('400 16px e-Ukraine').catch(() => [])
    })
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

  /** «Вийти» з меню чи паузи: сайт закриває гру; без сайту лишається головне меню. */
  private exitGame(): void {
    this.session.stop()
    this.go('main')
    bridge.exit()
  }

  private finish(league: number, track: number, timeMs: number): void {
    const prevBestMs: number | undefined = this.progress.best[bestKey(league, track)]
    const r = recordFinish(this.progress, league, track, timeMs, this.counts)
    this.progress = r.progress
    saveProgress(this.ns, this.progress)
    bridge.finished(league, track, timeMs, r.isBest)
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
