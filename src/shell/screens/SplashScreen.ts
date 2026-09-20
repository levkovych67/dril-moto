// src/shell/screens/SplashScreen.ts — наш лого-кадр 800 мс перед головним меню;
// тап пропускає (spec, «Потік екранів», п. 1). Лого поки текстове — до файлу від дизайнера.
import { strings } from '../strings.uk.ts'
import { Screen, el } from './dom.ts'

const SPLASH_MS = 800

export class SplashScreen extends Screen {
  private readonly done: () => void
  private timer = 0

  constructor(done: () => void) {
    super('splash')
    this.done = done
    this.root.addEventListener('pointerdown', () => this.finish())
  }

  render(): void {
    this.root.append(el('h1', 'title', strings.title))
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => this.finish(), SPLASH_MS)
  }

  hide(): void {
    window.clearTimeout(this.timer)
    super.hide()
  }

  /** Таймер і тап можуть спрацювати обидва — перехід лише один раз. */
  private finish(): void {
    if (this.root.hidden) return
    this.done()
  }
}
