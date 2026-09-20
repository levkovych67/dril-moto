// scripts/sprite-layout.mjs — розкладка спрайтів, яку двигун порту ріже кодом.
// Джерело правди — src/GameCanvas.ts:
//  - аркуші з кадрами: розмір кадру = розмір файлу / сітка (конструктор і
//    loadSprites), кадр n лежить у колонці n % 6 і рядку floor(n / 6), номер кадру
//    дає calcSpriteNo(кут, offset, range, count, flip): рука/нога/тулуб —
//    renderBodyPart, шолом — drawHelmet, двигун — renderEngine, крило — renderFender;
//  - sprites.png: статичні масиви spriteOffsetX/Y (лівий верхній кут у файлі) і
//    spriteSizeX/Y (розмір).
// Розміри файлів міняти не можна: розкладка sprites.png зашита в код, а кадри
// аркушів рахуються з розміру файлу.

export const STEP_DEG = 11.25

/**
 * kind 'turn' — деталь повертається разом із байком: кадр i = поза «байк стоїть
 * рівно», повернута проти годинникової стрілки на (i − levelFrame) × 11,25°;
 * 32 кадри — повне коло. kind 'limb' — сегмент тіла вершника: кадр i = сегмент,
 * повернутий за годинниковою стрілкою від вертикалі на i × 11,25° (0 — вертикально,
 * 8 — горизонтально); 16 кадрів — пів кола, сегмент і його розворот на 180°
 * беруть той самий кадр. Кадр покриває один крок 11,25° поруч зі своїм кутом:
 * рівний байк у шолома лягає на межу кадрів 31/0, у двигуна — на кадр 0, у крила —
 * на кадр 1 (перевірено розрахунком calcSpriteNo для стартової пози байка).
 */
export const SHEETS = [
  { file: 'helmet.png', width: 48, height: 48, cols: 6, rows: 6, used: 32, kind: 'turn', levelFrame: 0, what: 'шолом вершника' },
  { file: 'engine.png', width: 120, height: 120, cols: 6, rows: 6, used: 32, kind: 'turn', levelFrame: 0, what: 'рама й двигун байка' },
  { file: 'fender.png', width: 108, height: 108, cols: 6, rows: 6, used: 32, kind: 'turn', levelFrame: 1, what: 'заднє крило' },
  { file: 'bluearm.png', width: 48, height: 24, cols: 6, rows: 3, used: 16, kind: 'limb', what: 'рука' },
  { file: 'blueleg.png', width: 72, height: 36, cols: 6, rows: 3, used: 16, kind: 'limb', what: 'нога (стегно й гомілка — той самий аркуш)' },
  { file: 'bluebody.png', width: 60, height: 30, cols: 6, rows: 3, used: 16, kind: 'limb', what: 'тулуб (одяг вершника — Дріл-мерч)' },
]

/** Напрям «вперед» деталі в кадрі i на екрані (x праворуч, y донизу), одиничний вектор. */
export const frameDirection = (sheet, i) => {
  if (sheet.kind === 'turn') {
    const a = ((i - sheet.levelFrame) * STEP_DEG * Math.PI) / 180
    return [Math.cos(a), -Math.sin(a)]
  }
  const a = (i * STEP_DEG * Math.PI) / 180
  return [Math.sin(a), -Math.cos(a)]
}

export const SPRITES_PNG = { file: 'sprites.png', width: 49, height: 40 }

// race: чи малює спрайт заїзд «Дріл Мото». Канвасні меню порту (MenuManager) і
// екран завантаження з лого з main.ts недосяжні, тож їхні спрайти не малюються.
export const SPRITES = [
  { no: 0, x: 0, y: 10, w: 15, h: 15, race: true, what: 'тонка шина: ліга 0 — обидва колеса, ліга 1 — переднє' },
  { no: 1, x: 0, y: 25, w: 15, h: 15, race: true, what: 'товста шина: ліга 1 — заднє колесо, ліги 2–3 — обидва' },
  { no: 2, x: 15, y: 16, w: 8, h: 4, race: false, what: 'стрілка прокрутки канвасного меню вгору' },
  { no: 3, x: 15, y: 20, w: 8, h: 4, race: false, what: 'стрілка прокрутки канвасного меню вниз' },
  { no: 4, x: 15, y: 10, w: 3, h: 3, race: true, what: 'точка-шарнір вершника (дві на кадр)' },
  { no: 5, x: 0, y: 0, w: 6, h: 10, race: false, what: 'медаль 1-го місця (канвасні рекорди)' },
  { no: 6, x: 6, y: 0, w: 6, h: 10, race: false, what: 'медаль 2-го місця' },
  { no: 7, x: 12, y: 0, w: 6, h: 10, race: false, what: 'медаль 3-го місця' },
  { no: 8, x: 18, y: 8, w: 7, h: 8, race: false, what: 'закритий замок у канвасному меню' },
  { no: 9, x: 18, y: 0, w: 7, h: 8, race: false, what: 'відкритий замок у канвасному меню' },
  { no: 10, x: 25, y: 0, w: 12, h: 6, race: true, what: 'прапор старту, кадр A (цикл 12 → 10 → 11 → 10)' },
  { no: 11, x: 25, y: 6, w: 12, h: 6, race: true, what: 'прапор старту, кадр B' },
  { no: 12, x: 25, y: 12, w: 12, h: 6, race: true, what: 'прапор старту, кадр C' },
  { no: 13, x: 37, y: 0, w: 12, h: 6, race: true, what: 'прапор фінішу, кадр A (цикл 14 → 13 → 15 → 13)' },
  { no: 14, x: 37, y: 6, w: 12, h: 6, race: true, what: 'прапор фінішу, кадр B' },
  { no: 15, x: 37, y: 12, w: 12, h: 6, race: true, what: 'прапор фінішу, кадр C' },
  { no: 16, x: 15, y: 29, w: 16, h: 11, race: false, what: 'НЕ МАЛЮВАТИ: місце лого Codebrew на екрані завантаження, лишити прозорим' },
  { no: 17, x: 32, y: 18, w: 17, h: 22, race: false, what: 'НЕ МАЛЮВАТИ: місце лого Codebrew на екрані завантаження, лишити прозорим' },
]

// raster.png малює лише MenuManager.fillCanvasWithImage: тайл поверх гри під
// канвасними меню. Заїзд і DOM-меню його не використовують.
export const RASTER_PNG = { file: 'raster.png', width: 64, height: 64 }
