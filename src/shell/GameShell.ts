// src/shell/GameShell.ts — тимчасова версія Task 6: заїзд першого дев-треку через RaceSession
// з DOM-HUD; у Task 7 виросте в стан-машину екранів. Меню ще нема: пауза й фініш — у консоль.
import DEV_PACK_URL from '../assets/dev-pack.mrg?url'
import { createEngine } from './engine.ts'
import { decodeMrg } from './mrg.ts'
import { formatTime } from './RaceLoop.ts'
import { RaceSession } from './RaceSession.ts'
import { el } from './screens/dom.ts'

export class GameShell {
  async start(root: HTMLElement): Promise<void> {
    root.replaceChildren()
    const stage = el('div', 'stage')
    const canvas = el('canvas', 'game-canvas')
    stage.append(canvas)
    root.append(stage)

    const buffer = await (await fetch(DEV_PACK_URL)).arrayBuffer()
    // decodeMrg лише читає буфер: той самий буфер далі йде в LevelLoader; '_' двигун показує пробілом
    const name = decodeMrg(buffer).leagues[0][0].name.replaceAll('_', ' ')
    const engine = await createEngine(canvas, buffer)
    const session: RaceSession = new RaceSession(engine, {
      onPaused: () => console.log('pause'),
      onResumeRequest: () => session.resume(),
      onFinish: (_league, _track, timeMs) => console.log('finish', formatTime(timeMs)),
    })
    new ResizeObserver(() => {
      engine.resize()
      engine.render()
    }).observe(stage)
    session.mount(stage, canvas)
    session.show(true)
    session.start(0, 0, name)
  }
}
