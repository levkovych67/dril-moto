// scripts/check-mrg.mjs — round-trip енкодера/декодера .mrg і, якщо задано GD_ORIGINAL_MRG
// (оригінальний пак поза репозиторієм), калібрування.
//   node scripts/check-mrg.mjs
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { encodeMrg, decodeMrg, START_SCALE } from '../src/shell/mrg.ts'
import { parseTrackJson } from '../src/shell/trackJson.ts'

let n = 0
const check = (name, fn) => {
  fn()
  n += 1
  console.log('ok -', name)
}

// Лише для кодека: геометрія тут не валідується. y росте вгору, старт на 18 вище першої точки.
const track = (name, points) => ({
  name,
  start: [points[0][0] + 10, points[0][1] + 18],
  finish: [points.at(-1)[0] - 10, 0],
  points,
})

const simple = track('Lanka', [[0, 100], [50, 100], [100, 80], [150, 90]])
// дельти за межами байта і dx = -1 мусять іти escape-гілкою
const wide = track('Wide', [[0, 0], [300, 10], [299, 12], [420, -140], [421, -139]])
const pack = { leagues: [[simple, wide], [simple], [wide]] }

check('round-trip зберігає ліги, назви, старт, фініш і точки', () => {
  const back = decodeMrg(encodeMrg(pack))
  assert.deepEqual(back, pack)
})

check('старт/фініш у файлі помножені на START_SCALE', () => {
  const buf = Buffer.from(encodeMrg({ leagues: [[simple], [], []] }))
  // заголовок: int32 count ліги 0, далі int32 offset першого треку
  const off = buf.readInt32BE(4)
  assert.equal(buf[off], 0x33)
  assert.equal(buf.readInt32BE(off + 1), simple.start[0] * START_SCALE)
  assert.equal(buf.readInt32BE(off + 5), simple.start[1] * START_SCALE)
  assert.equal(START_SCALE, 8192)
})

check('дельта dx = -1 не плутається з escape', () => {
  const t = track('Minus', [[0, 0], [-1, 5], [-2, 5]])
  assert.deepEqual(decodeMrg(encodeMrg({ leagues: [[t], [], []] })).leagues[0][0].points, t.points)
})

check('назва в .mrg лише ASCII', () => {
  assert.throws(() => encodeMrg({ leagues: [[{ ...simple, name: 'Ланка' }], [], []] }), /ASCII/)
  assert.throws(() => encodeMrg({ leagues: [[{ ...simple, name: 'x'.repeat(40) }], [], []] }), /ASCII/)
})

const valid = { name: 'A', start: [100, 18], finish: [300, 0], points: [[0, 0], [150, 0], [250, 0], [300, 0], [500, 0]] }

check('parseTrackJson приймає правильний трек і ловить помилки геометрії', () => {
  assert.deepEqual(parseTrackJson(valid), valid)
  const bad = (patch, re) => assert.throws(() => parseTrackJson({ ...valid, ...patch }), re)
  bad({ points: [[0, 0], [150, 0], [140, 0], [300, 0], [500, 0]] }, /зростати/)
  bad({ start: [300, 18], finish: [100, 0] }, /фініш/)
  bad({ start: [100, -40] }, /вище землі/)
  bad({ start: [100, 8] }, /вище землі/)
  bad({ start: [20, 18] }, /першої точки/)
  bad({ finish: [400, 0] }, /після finish/)
  bad({ start: [100, 28], points: [[0, 0], [80, 0], [200, 60], [300, 60], [500, 60]] }, /вʼязне/)
})

const original = process.env.GD_ORIGINAL_MRG
if (original && existsSync(original)) {
  check('калібрування: оригінальний пак читається і пишеться байт у байт', () => {
    const file = readFileSync(original)
    // Buffer може бути виглядом у більший спільний ArrayBuffer — ріжемо рівно файл
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
    const p = decodeMrg(buffer)
    const intro = p.leagues[0][0]
    assert.equal(intro.name, 'Intro')
    assert.equal(intro.points.length, 45)
    assert.deepEqual(intro.points[0], [-380, 136])
    assert.deepEqual(intro.start, [-49, 24])
    assert.deepEqual(intro.finish, [433, 0])
    assert.deepEqual(parseTrackJson(intro), intro)
    assert.ok(Buffer.from(encodeMrg(p)).equals(file), 'encodeMrg(decodeMrg(оригінал)) має збігатися байт у байт')
  })
} else {
  console.log('skip - калібрування (GD_ORIGINAL_MRG не задано)')
}

console.log(`ok: ${n} checks`)
