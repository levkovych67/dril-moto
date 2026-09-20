// scripts/check-palette.mjs — ролі кольорів порту → токени сайту, обидві теми.
//   node scripts/check-palette.mjs
import assert from 'node:assert/strict'
import { hexToRgb, mapColor } from '../src/shell/palette.ts'

const palette = (paper, ink, depth, accent) => ({
  paper: hexToRgb(paper),
  ink: hexToRgb(ink),
  track: hexToRgb(ink),
  depth: hexToRgb(depth),
  accent: hexToRgb(accent),
})
// значення з src/shell/theme.css (:root і [data-theme='dark'])
const light = palette('#ffffff', '#000000', '#606060', '#0073e6')
const dark = palette('#101413', '#f2f4f3', '#a7b0ac', '#58a6ff')

assert.deepEqual(mapColor(light, 255, 255, 255), [255, 255, 255], 'світла: фон лишається білим')
assert.deepEqual(mapColor(light, 128, 128, 128), [128, 128, 128], 'світла: сірі без змін')
assert.deepEqual(mapColor(light, 0, 255, 0), [0, 0, 0], 'світла: трек чорний')
assert.deepEqual(mapColor(dark, 255, 255, 255), [16, 20, 19], 'темна: фон = --background')
assert.deepEqual(mapColor(dark, 0, 0, 0), [242, 244, 243], 'темна: спиці й древка = --text-primary')
assert.deepEqual(mapColor(dark, 0, 255, 0), [242, 244, 243], 'темна: трек = --text-primary')
assert.deepEqual(mapColor(dark, 0, 170, 0), [167, 176, 172], 'темна: перспектива = --text-secondary')
assert.deepEqual(mapColor(dark, 170, 0, 0), [88, 166, 255], 'темна: червоне = --accent')
assert.deepEqual(mapColor(dark, 212, 212, 212), [54, 58, 57], 'темна: найсвітліша тінь майже фон')
assert.throws(() => hexToRgb('rgb(0 0 0)'))
console.log('ok: palette')
