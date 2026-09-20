// scripts/make-sprite-template.mjs — шаблони для дизайнера й docs/sprites.md.
// Для кожного файлу з scripts/sprite-layout.mjs малює збільшений у SCALE разів
// шаблон docs/sprite-templates/<name>@8x.png: сітка пікселів, межі кадрів
// (зелена — кадр «байк стоїть рівно» / вертикальний сегмент, червона — решта),
// синій промінь «вперед» за правилом кадру, сіре штрихування — клітинки, які
// двигун не читає. Сам спрайт дизайнер віддає в розмірі 1×, рівно як у таблиці.
// Запуск: node scripts/make-sprite-template.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { createCanvas, drawLine, encodePng, fillRect, setPixel, strokeRect } from './png.mjs'
import { RASTER_PNG, SHEETS, SPRITES, SPRITES_PNG, STEP_DEG, frameDirection } from './sprite-layout.mjs'

const SCALE = 8
const GRID = [225, 225, 225]
const RED = [230, 30, 30]
const GREEN = [0, 170, 60]
const BLUE = [0, 90, 255]
const HATCH = [170, 170, 170]
const STEP = String(STEP_DEG).replace('.', ',')
const outDir = new URL('../docs/sprite-templates/', import.meta.url)
mkdirSync(outDir, { recursive: true })

const pixelGrid = (c) => {
  for (let x = 0; x < c.width; x += SCALE) fillRect(c, x, 0, 1, c.height, GRID)
  for (let y = 0; y < c.height; y += SCALE) fillRect(c, 0, y, c.width, 1, GRID)
}

const hatch = (c, x, y, w, h) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if ((xx + yy) % 6 === 0) setPixel(c, xx, yy, HATCH)
}

const save = (name, c) => {
  writeFileSync(new URL(name, outDir), encodePng(c))
  console.log('ok -', `docs/sprite-templates/${name}`)
}

for (const sheet of SHEETS) {
  const c = createCanvas(sheet.width * SCALE, sheet.height * SCALE)
  pixelGrid(c)
  const fw = (sheet.width / sheet.cols) * SCALE
  const fh = (sheet.height / sheet.rows) * SCALE
  for (let i = 0; i < sheet.cols * sheet.rows; i++) {
    const x = (i % sheet.cols) * fw
    const y = Math.floor(i / sheet.cols) * fh
    if (i >= sheet.used) {
      hatch(c, x, y, fw, fh)
      continue
    }
    const isLevel = sheet.kind === 'turn' ? i === sheet.levelFrame : i === 0
    strokeRect(c, x, y, fw, fh, isLevel ? GREEN : RED)
    const [dx, dy] = frameDirection(sheet, i)
    const r = Math.min(fw, fh) / 2 - SCALE
    const cx = x + fw / 2
    const cy = y + fh / 2
    const from = sheet.kind === 'turn' ? 0 : -r
    drawLine(c, cx + dx * from, cy + dy * from, cx + dx * r, cy + dy * r, BLUE)
  }
  save(sheet.file.replace('.png', '@8x.png'), c)
}

{
  const c = createCanvas(SPRITES_PNG.width * SCALE, SPRITES_PNG.height * SCALE)
  pixelGrid(c)
  for (const s of SPRITES) {
    const [x, y, w, h] = [s.x * SCALE, s.y * SCALE, s.w * SCALE, s.h * SCALE]
    if (s.no === 16 || s.no === 17) hatch(c, x, y, w, h)
    else strokeRect(c, x, y, w, h, s.race ? GREEN : RED)
  }
  save('sprites@8x.png', c)
}

const sheetRows = SHEETS.map((s) => {
  const rule =
    s.kind === 'turn'
      ? `кадр ${s.levelFrame} — байк стоїть рівно; кадр i повернутий проти годинникової на ${s.levelFrame === 0 ? 'i' : `(i − ${s.levelFrame})`} × ${STEP}°`
      : `кадр 0 — сегмент вертикально, кадр i повернутий за годинниковою на i × ${STEP}°, кадр 8 — горизонтально`
  return `| \`${s.file}\` | ${s.width}×${s.height} | ${s.cols}×${s.rows} | ${s.width / s.cols}×${s.height / s.rows} | ${s.used} з ${s.cols * s.rows} | ${s.what} | ${rule} |`
})

const spriteRows = SPRITES.map((s) => `| ${s.no} | ${s.x} | ${s.y} | ${s.w} | ${s.h} | ${s.race ? 'так' : 'ні'} | ${s.what} |`)

const md = `# Спрайти «Дріл Мото»

Згенеровано \`node scripts/make-sprite-template.mjs\` з \`scripts/sprite-layout.mjs\`; руками не
редагувати. Шаблони — \`docs/sprite-templates/*@8x.png\` (збільшені у ${SCALE} разів, лише для
орієнтира). Готові файли кладуться в \`src/assets/\` у розмірі 1×, рівно як у таблицях: двигун
ріже їх за розміром файлу і за таблицями в \`src/GameCanvas.ts\`. Фон прозорий (альфа 0).

Спрайти палітрою теми не перефарбовуються: кольори такі, як намальовані. Кожен кадр має
читатися і на #ffffff (світла тема), і на #101413 (темна): основні форми з контрастом не менше
3:1 до обох фонів, наприклад середній тон або світла заливка з темним контуром 1px. Шини — теж
спрайти (sprites.png, кадри 0 і 1, 15×15), а не код; кодом малюються лише спиці, дуга над
переднім колесом, маточини, вилка (сіра лінія від рами до осі переднього колеса) і древка
прапорців, їх колір дає палітра; вилку в engine.png не малювати.

## Аркуші з кадрами за кутом

Кадр n лежить у колонці n % 6 і рядку ⌊n / 6⌋ (нумерація по рядках зліва направо).
Кожен кадр малюється по центру точки, яку рахує фізика, тож деталь має бути по центру
кадру. Кадр покриває один крок 11,25° поруч зі своїм кутом; на розмірі 8–20 px різниця
в межах кроку не видна, тож малюй кадр рівно під кутом із таблиці.

| Файл | Розмір | Сітка | Кадр | Вжито | Що | Кут кадру |
| ---- | ------ | ----- | ---- | ----- | -- | --------- |
${sheetRows.join('\n')}

- Шолом, двигун, крило: 32 кадри — повне коло; кадр i+1 — той самий малюнок, повернутий ще
  на ${STEP}° проти годинникової стрілки. Коли вершник нахиляється
  (\`riderPoseBlendF16 > 32768\`), шолом бере кадр ще на 18° за годинниковою стрілкою.
- Рука, нога, тулуб: 16 кадрів — пів кола; сегмент від суглоба до суглоба і той самий сегмент,
  розвернутий на 180°, беруть той самий кадр, тож малюнок має читатися в обидва боки. Нога
  малюється двічі (стегно й гомілка) з одного аркуша.
- Клітинки поза «Вжито» двигун не читає; їх лишити прозорими.

## sprites.png (${SPRITES_PNG.width}×${SPRITES_PNG.height})

Прямокутники зашиті в код (\`spriteOffsetX/Y\`, \`spriteSizeX/Y\`); x, y — лівий верхній кут
у файлі. «У заїзді: ні» — спрайти канвасних меню порту, які «Дріл Мото» не показує; їх
можна лишити простими.

| № | x | y | w | h | У заїзді | Що |
| - | - | - | - | - | -------- | -- |
${spriteRows.join('\n')}

- Шини 0 і 1: центр прямокутника = центр колеса, радіус колеса на екрані ≈ 7 px. Спиці
  й дугу поверх шини малює код; середина шини має бути прозорою.
- Прапори 10–15: стовпчик (лінія 32 px від точки треку вгору) малює код кольором палітри;
  лівий верхній кут прапора стоїть на верхівці стовпчика, тож колонка 0 лягає на стовпчик,
  а тканина — праворуч.
- 4: точка 3×3 по центру шарніра вершника.

## raster.png (${RASTER_PNG.width}×${RASTER_PNG.height})

Тайл, яким \`MenuManager\` порту притіняє гру під канвасними меню. «Дріл Мото» його не
показує (DOM-меню), у \`dist/\` він не потрапляє; файл лишається плейсхолдером.
`

writeFileSync(new URL('../docs/sprites.md', import.meta.url), md)
console.log('ok - docs/sprites.md')
