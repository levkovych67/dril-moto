// scripts/make-placeholder-sprites.mjs — тимчасові спрайти замість файлів Codebrew.
// Ті самі розміри й розкладка, що ріже двигун (scripts/sprite-layout.mjs). У кожному
// вжитому кадрі аркуша — промінь «вперед», повернутий за правилом кадру, тож на
// екрані видно, що кадри повертаються разом із байком. Фон прозорий, як в оригіналах:
// непрозорий фон закрив би лінії треку за байком. Кольори деталей, шин і прапорів —
// середні тони з контрастом ≥ 3:1 і до #ffffff (світла тема), і до #101413 (темна):
// спрайти палітрою теми не перефарбовуються.
// Запуск: node scripts/make-placeholder-sprites.mjs
import { writeFileSync } from 'node:fs'
import { createCanvas, drawLine, encodePng, fillRect, setPixel, strokeRect } from './png.mjs'
import { RASTER_PNG, SHEETS, SPRITES, SPRITES_PNG, frameDirection } from './sprite-layout.mjs'

const COLORS = {
  'helmet.png': [240, 60, 60],
  'engine.png': [110, 110, 110],
  'fender.png': [140, 140, 140],
  'bluearm.png': [50, 110, 220],
  'blueleg.png': [50, 110, 220],
  'bluebody.png': [60, 140, 100],
}
const BLACK = [0, 0, 0]
const WHITE = [255, 255, 255]
const GREY = [128, 128, 128] // шини й шарнір: 3,95:1 на білому, 4,7:1 на #101413
const GREEN = [40, 160, 70]

const save = (file, canvas) => {
  writeFileSync(new URL(`../src/assets/${file}`, import.meta.url), encodePng(canvas))
  console.log('ok -', file, `${canvas.width}x${canvas.height}`)
}

const disk = (c, cx, cy, r, color) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPixel(c, x, y, color)
    }
  }
}

const ring = (c, cx, cy, r, width, color) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d <= r && d > r - width) setPixel(c, x, y, color)
    }
  }
}

for (const sheet of SHEETS) {
  const c = createCanvas(sheet.width, sheet.height)
  const fw = sheet.width / sheet.cols
  const fh = sheet.height / sheet.rows
  const color = COLORS[sheet.file]
  for (let i = 0; i < sheet.used; i++) {
    const cx = (i % sheet.cols) * fw + (fw - 1) / 2
    const cy = Math.floor(i / sheet.cols) * fh + (fh - 1) / 2
    const r = Math.min(fw, fh) / 2 - 1
    const [dx, dy] = frameDirection(sheet, i)
    if (sheet.kind === 'turn') {
      disk(c, cx, cy, r * 0.45, color)
      drawLine(c, cx, cy, cx + dx * r, cy + dy * r, color)
      setPixel(c, Math.round(cx + dx * r), Math.round(cy + dy * r), WHITE)
    } else {
      drawLine(c, cx - dx * r, cy - dy * r, cx + dx * r, cy + dy * r, color)
      drawLine(c, cx - dx * r + 1, cy - dy * r, cx + dx * r + 1, cy + dy * r, color)
    }
  }
  save(sheet.file, c)
}

{
  const c = createCanvas(SPRITES_PNG.width, SPRITES_PNG.height)
  const at = (no) => SPRITES.find((s) => s.no === no)
  for (const no of [0, 1]) {
    const s = at(no)
    ring(c, s.x + (s.w - 1) / 2, s.y + (s.h - 1) / 2, s.w / 2, no === 0 ? 1.5 : 2.5, GREY)
  }
  for (const no of [2, 3]) {
    const s = at(no)
    for (let row = 0; row < s.h; row++) {
      const half = no === 2 ? row + 1 : s.h - row
      fillRect(c, s.x + s.w / 2 - half, s.y + row, half * 2, 1, BLACK)
    }
  }
  fillRect(c, at(4).x, at(4).y, 3, 3, GREY)
  const medals = { 5: [230, 190, 40], 6: [190, 190, 200], 7: [190, 120, 60] }
  for (const [no, medal] of Object.entries(medals)) {
    const s = at(Number(no))
    fillRect(c, s.x + 1, s.y + 4, s.w - 2, s.h - 4, medal)
    fillRect(c, s.x + 2, s.y, 2, 4, [200, 40, 40])
  }
  for (const no of [8, 9]) {
    const s = at(no)
    strokeRect(c, s.x + 1, s.y, s.w - 2, 4, BLACK)
    fillRect(c, s.x, s.y + 3, s.w, s.h - 3, no === 8 ? BLACK : [230, 190, 40])
  }
  // прапори: колонка 0 лягає на стовпчик, який малює код; тканина праворуч
  for (const [frame, no] of [10, 11, 12].entries()) {
    const s = at(no)
    fillRect(c, s.x + 1, s.y + (frame % 2), s.w - 1 - frame, s.h - 1, GREEN)
  }
  for (const [frame, no] of [13, 14, 15].entries()) {
    const s = at(no)
    for (let y = 0; y < s.h - 1; y++) {
      for (let x = 1; x < s.w - frame; x++) {
        setPixel(c, s.x + x, s.y + y + (frame % 2), (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? WHITE : BLACK)
      }
    }
  }
  // 16 і 17 лишаються прозорими: це місце лого Codebrew, двигун його не малює
  save(SPRITES_PNG.file, c)
}

{
  // тайл під канвасними меню порту (MenuManager): 50% сітка світло-сірого
  const c = createCanvas(RASTER_PNG.width, RASTER_PNG.height)
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) if ((x + y) % 2 === 0) setPixel(c, x, y, [236, 236, 236])
  }
  save(RASTER_PNG.file, c)
}
