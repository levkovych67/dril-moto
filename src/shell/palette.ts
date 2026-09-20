// src/shell/palette.ts — перефарбовування кольорів порту в токени сайту.
// Двигун задає кольори сталими rgb-трійками (GameCanvas, GamePhysics, GameLevel,
// LevelLoader); тут кожна трійка отримує роль, а роль — токен із theme.css.
// hexToRgb і mapColor чисті (їх ганяє scripts/check-palette.mjs); readPalette і
// applyPalette читають DOM.
import type { GameCanvas } from '../GameCanvas.ts'

export type Rgb = readonly [number, number, number]

export interface Palette {
  paper: Rgb // --background: фон заїзду (255,255,255), заливка смуги прогресу
  ink: Rgb // --text-primary: (0,0,0) спиці, древка прапорців, рамка смуги прогресу
  track: Rgb // --text-primary: (0,255,0) передня лінія треку
  depth: Rgb // --text-secondary: (0,170,0) лінії перспективи (задня кромка й поперечки)
  accent: Rgb // --accent: (170,0,0) дуга над переднім колесом, (255,0,0) маточини ліг 1–2
}

export const hexToRgb = (hex: string): Rgb => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (m === null) throw new Error(`Токен палітри має бути #rrggbb, отримано «${hex}»`)
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

const mix = (from: Rgb, to: Rgb, t: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * t),
  Math.round(from[1] + (to[1] - from[1]) * t),
  Math.round(from[2] + (to[2] - from[2]) * t),
]

export const mapColor = (p: Palette, r: number, g: number, b: number): Rgb => {
  if (r === 0 && g === 255 && b === 0) return p.track
  if (r === 0 && g === 170 && b === 0) return p.depth
  // Сірі порту: 0 чорне, 255 біле, 128 вилка, 0…212 тіні (GameLevel.renderShadow) —
  // та сама частка шляху від ink до paper, тож тінь і вдень, і вночі тане у фон.
  if (r === g && g === b) return mix(p.ink, p.paper, r / 255)
  return p.accent
}

/** Читає токени з <html>, на якому вже стоїть data-theme. */
export const readPalette = (root: HTMLElement): Palette => {
  const css = getComputedStyle(root)
  const token = (name: string): Rgb => hexToRgb(css.getPropertyValue(name))
  const text = token('--text-primary')
  return { paper: token('--background'), ink: text, track: text, depth: token('--text-secondary'), accent: token('--accent') }
}

/** Ставить палітру теми на канвас двигуна; якщо токени не #rrggbb — лишаються кольори порту. */
export const applyPalette = (canvas: GameCanvas, root: HTMLElement): void => {
  try {
    const palette = readPalette(root)
    canvas.colorMap = (r, g, b) => mapColor(palette, r, g, b)
  } catch (error) {
    console.warn('Палітра теми недоступна, канвас лишається в кольорах порту', error)
  }
}
