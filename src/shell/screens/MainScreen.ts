import { strings } from '../strings.uk.ts'
import { Screen, button, el } from './dom.ts'

export interface MainActions {
  play(): void
  records(): void
  about(): void
  exit(): void
}

export class MainScreen extends Screen {
  private readonly a: MainActions

  constructor(a: MainActions) {
    super('main')
    this.a = a
  }

  render(): void {
    this.root.append(
      el('h1', 'title', strings.title),
      button(strings.main.play, 'btn btn-primary', () => this.a.play()),
      button(strings.main.records, 'btn', () => this.a.records()),
      button(strings.main.about, 'btn', () => this.a.about()),
      button(strings.main.exit, 'btn btn-ghost', () => this.a.exit()),
    )
  }
}
