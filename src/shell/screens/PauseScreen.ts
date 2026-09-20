// src/shell/screens/PauseScreen.ts — пауза поверх замороженого кадру заїзду.
import { strings } from '../strings.uk.ts'
import { Screen, button, el } from './dom.ts'

export interface PauseActions {
  resume(): void
  restart(): void
  tracks(): void
  exit(): void
}

export class PauseScreen extends Screen {
  private readonly a: PauseActions

  constructor(a: PauseActions) {
    super('pause')
    this.a = a
  }

  render(): void {
    this.root.append(
      el('h2', 'heading', strings.pause.heading),
      button(strings.pause.resume, 'btn btn-primary', () => this.a.resume()),
      button(strings.pause.restart, 'btn', () => this.a.restart()),
      button(strings.pause.tracks, 'btn', () => this.a.tracks()),
      button(strings.pause.exit, 'btn btn-ghost', () => this.a.exit()),
    )
  }
}
