// src/shell/screens/AboutScreen.ts — кредити (spec, секція 6), версія бандлу, посилання на код.
import { strings } from '../strings.uk.ts'
import { Screen, button, el } from './dom.ts'

export class AboutScreen extends Screen {
  private readonly back: () => void

  constructor(back: () => void) {
    super('about')
    this.back = back
  }

  render(): void {
    this.root.append(el('h2', 'heading', strings.about.heading))
    for (const text of strings.about.text) this.root.append(el('p', 'about-text', text))
    const source = el('a', 'about-link', strings.about.source)
    source.href = strings.about.sourceUrl
    source.target = '_blank'
    source.rel = 'noopener noreferrer'
    this.root.append(
      source,
      el('p', 'about-text', strings.about.disclaimer),
      el('p', 'about-version', strings.about.version(import.meta.env.VITE_APP_VERSION ?? 'dev')),
      button(strings.about.back, 'btn btn-ghost', () => this.back()),
    )
  }
}
