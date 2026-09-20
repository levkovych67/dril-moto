// src/shell/engine.ts — збирає двигун порту без MenuManager. Повторює те, що
// app.ts і MenuManager.initPart(1..7) роблять із двигуном до першого кадру заїзду
// (налаштування за замовчуванням: перспектива, тіні, look-ahead, спрайти байка й
// вершника увімкнені, Keyset 1). Логіка заїзду — у RaceLoop.
import { GameCanvas } from '../GameCanvas.ts'
import { GamePhysics } from '../GamePhysics.ts'
import { LevelLoader } from '../LevelLoader.ts'
import { Micro } from '../Micro.ts'
import { FileStream } from '../utils/FileStream.ts'

export interface Engine {
  micro: Micro
  canvas: GameCanvas
  physics: GamePhysics
  levels: LevelLoader
  resize(): void
  render(): void
}

const ALL_SPRITES = 3
const DEFAULT_INPUT_MODE = 0

export const createEngine = async (canvasElement: HTMLCanvasElement, packBuffer: ArrayBuffer): Promise<Engine> => {
  const micro = new Micro()
  Micro.isGameVisible = true
  Micro.isInGameMenu = false
  const levels = new LevelLoader(new FileStream(packBuffer))
  const physics = new GamePhysics(levels)
  const canvas = await GameCanvas.create(canvasElement, micro)
  micro.levelLoader = levels
  micro.gamePhysics = physics
  micro.gameCanvas = canvas
  canvas.init(physics)
  physics.applyLoadedSpriteFlags(await canvas.loadSprites(ALL_SPRITES))
  LevelLoader.isEnabledPerspective = true
  LevelLoader.isEnabledShadows = true
  physics.setEnableLookAhead(true)
  canvas.setInputMode(DEFAULT_INPUT_MODE)
  canvas.isDrawingTime = false
  physics.setMode(1)

  const resize = () => {
    const rect = canvasElement.parentElement?.getBoundingClientRect()
    let width = Math.floor(rect?.width ?? 0)
    let height = Math.floor(rect?.height ?? 0)
    if (width <= 0 || height <= 0) {
      width = window.innerWidth
      height = window.innerHeight
    }
    canvas.resize(width, height)
    physics.setMinimalScreenWH(Math.min(width, height))
  }
  const render = () => canvas.paint(canvas.getGraphics())
  canvas.setRepaintHandler(render)
  resize()
  canvas.requestRepaint(0)
  return { micro, canvas, physics, levels, resize, render }
}
