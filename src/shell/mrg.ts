// src/shell/mrg.ts — пак треків у форматі .mrg (той, що читає LevelLoader/GameLevel).
// Big endian. Заголовок: для кожної з 3 ліг int32 count, далі для кожного треку
// int32 offset + назва (байти ASCII) + 0x00. Дані треку: 0x33, старт x/y і
// фініш x/y як int32 × START_SCALE, int16 кількість точок, перша точка int32 x, y,
// далі дельти int8 dx, int8 dy; dx = -1 — escape, за ним абсолютні int32 x, y.
// Без імпортів: перевіряється scripts/check-mrg.mjs під node.

export interface MrgTrack {
  name: string
  start: [number, number]
  finish: [number, number]
  points: [number, number][]
}

export interface MrgPack {
  leagues: [MrgTrack[], MrgTrack[], MrgTrack[]]
}

/** Старт і фініш у файлі лежать як (unit << 16) >> 3, тобто unit × 8192. */
export const START_SCALE = 8192
const MARK = 0x33
const ESCAPE = -1

const fitsByte = (v: number) => v >= -128 && v <= 127
/** LevelLoader.loadLevels читає назву до 40 байт разом із 0x00 як ASCII, '_' показує пробілом. */
const MRG_NAME = /^[\x20-\x7e]{1,39}$/

const trackBytes = (t: MrgTrack): Uint8Array => {
  const out: number[] = []
  const i32 = (v: number) => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)
  const i16 = (v: number) => out.push((v >>> 8) & 255, v & 255)
  const i8 = (v: number) => out.push(v & 255)
  out.push(MARK)
  i32(t.start[0] * START_SCALE)
  i32(t.start[1] * START_SCALE)
  i32(t.finish[0] * START_SCALE)
  i32(t.finish[1] * START_SCALE)
  i16(t.points.length)
  i32(t.points[0][0])
  i32(t.points[0][1])
  for (let i = 1; i < t.points.length; i++) {
    const dx = t.points[i][0] - t.points[i - 1][0]
    const dy = t.points[i][1] - t.points[i - 1][1]
    if (fitsByte(dx) && fitsByte(dy) && dx !== ESCAPE) {
      i8(dx)
      i8(dy)
    } else {
      i8(ESCAPE)
      i32(t.points[i][0])
      i32(t.points[i][1])
    }
  }
  return Uint8Array.from(out)
}

export const encodeMrg = (pack: MrgPack): ArrayBuffer => {
  for (const t of pack.leagues.flat()) {
    if (!MRG_NAME.test(t.name)) throw new Error(`назва «${t.name}»: у .mrg лише ASCII від пробілу до ~, 1–39 символів`)
  }
  const bodies = pack.leagues.map((l) => l.map(trackBytes))
  let headerSize = 0
  for (const league of pack.leagues) {
    headerSize += 4
    for (const t of league) headerSize += 4 + t.name.length + 1
  }
  const total = headerSize + bodies.flat().reduce((s, b) => s + b.length, 0)
  const buf = new Uint8Array(total)
  const view = new DataView(buf.buffer)
  let h = 0
  let d = headerSize
  for (let l = 0; l < 3; l++) {
    view.setInt32(h, pack.leagues[l].length)
    h += 4
    for (let i = 0; i < pack.leagues[l].length; i++) {
      view.setInt32(h, d)
      h += 4
      for (const ch of pack.leagues[l][i].name) buf[h++] = ch.charCodeAt(0)
      buf[h++] = 0
      buf.set(bodies[l][i], d)
      d += bodies[l][i].length
    }
  }
  return buf.buffer
}

export const decodeMrg = (buffer: ArrayBuffer): MrgPack => {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let p = 0
  const entries: { name: string; offset: number }[][] = [[], [], []]
  for (let l = 0; l < 3; l++) {
    const count = view.getInt32(p)
    p += 4
    for (let i = 0; i < count; i++) {
      const offset = view.getInt32(p)
      p += 4
      let name = ''
      // LevelLoader відводить 40 байтів на назву разом з NUL. Не можна
      // читати за кінець Uint8Array: undefined ніколи не дорівнює 0.
      const nameLimit = Math.min(p + 40, bytes.length)
      while (p < nameLimit && bytes[p] !== 0) name += String.fromCharCode(bytes[p++])
      if (p === nameLimit) throw new Error('некоректний .mrg: назва має завершуватися NUL не пізніше 39 байтів')
      p++
      entries[l].push({ name, offset })
    }
  }
  const readTrack = (name: string, offset: number): MrgTrack => {
    let q = offset
    const mark = view.getInt8(q++)
    if (mark === 0x32) q += 20
    const start: [number, number] = [view.getInt32(q) / START_SCALE, view.getInt32(q + 4) / START_SCALE]
    const finish: [number, number] = [view.getInt32(q + 8) / START_SCALE, view.getInt32(q + 12) / START_SCALE]
    q += 16
    const count = view.getInt16(q)
    q += 2
    let x = view.getInt32(q)
    let y = view.getInt32(q + 4)
    q += 8
    const points: [number, number][] = [[x, y]]
    for (let i = 1; i < count; i++) {
      const dx = view.getInt8(q++)
      if (dx === ESCAPE) {
        x = view.getInt32(q)
        y = view.getInt32(q + 4)
        q += 8
      } else {
        x += dx
        y += view.getInt8(q++)
      }
      points.push([x, y])
    }
    return { name, start, finish, points }
  }
  return {
    leagues: [
      entries[0].map((e) => readTrack(e.name, e.offset)),
      entries[1].map((e) => readTrack(e.name, e.offset)),
      entries[2].map((e) => readTrack(e.name, e.offset)),
    ],
  }
}
