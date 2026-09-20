// src/shell/screens/menus.ts — збирає всі DOM-екрани меню в одну мапу для GameShell.
// Екрани не знають одне про одного: переходи й дії приходять через MenuActions.
// Версія Task 7: без «Рекордів» і «Про гру» — їх додає Task 8.
import type { Progress } from '../Progress.ts'
import type { Screen } from './dom.ts'
import { FinishScreen } from './FinishScreen.ts'
import { LeaguesScreen, type TrackCounts } from './LeaguesScreen.ts'
import { MainScreen } from './MainScreen.ts'
import { PauseScreen } from './PauseScreen.ts'
import { SplashScreen } from './SplashScreen.ts'
import { TracksScreen } from './TracksScreen.ts'

export type MenuId = 'splash' | 'main' | 'leagues' | 'tracks' | 'pause' | 'finish'

export interface MenuActions {
  progress(): Progress
  trackNames(): string[][]
  trackCounts(): TrackCounts
  go(id: MenuId): void
  openTracks(league: number): void
  startTrack(league: number, track: number): void
  /** «Далі» на фініші: наступний відкритий трек. */
  startNext(): void
  /** «Заново» на фініші: той самий трек. */
  retry(): void
  /** Пауза: «Продовжити», «Заново», «До треків». */
  resume(): void
  restart(): void
  toTracks(): void
  exit(): void
}

export interface Menus {
  screens: Record<MenuId, Screen>
  tracks: TracksScreen
  finish: FinishScreen
}

export const createMenus = (a: MenuActions): Menus => {
  const progress = () => a.progress()
  const names = () => a.trackNames()
  const tracks = new TracksScreen(progress, names, {
    start: (league, track) => a.startTrack(league, track),
    back: () => a.go('leagues'),
  })
  const finish = new FinishScreen({ next: () => a.startNext(), restart: () => a.retry(), tracks: () => a.toTracks() })
  const screens: Record<MenuId, Screen> = {
    splash: new SplashScreen(() => a.go('main')),
    main: new MainScreen({ play: () => a.go('leagues'), exit: () => a.exit() }),
    leagues: new LeaguesScreen(progress, () => a.trackCounts(), {
      open: (league) => a.openTracks(league),
      back: () => a.go('main'),
    }),
    tracks,
    pause: new PauseScreen({
      resume: () => a.resume(),
      restart: () => a.restart(),
      tracks: () => a.toTracks(),
      exit: () => a.exit(),
    }),
    finish,
  }
  return { screens, tracks, finish }
}
