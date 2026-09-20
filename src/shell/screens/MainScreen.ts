import { strings } from '../strings.uk.ts'
import { Screen, button, el } from './dom.ts'

export interface MainActions {
  play(): void
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
      button(strings.main.exit, 'btn btn-ghost', () => this.a.exit()),
    )
  }
}
