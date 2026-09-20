// src/shell/pack.ts — звідки брати пак треків і назви для списків.
//  - ?debug&json=<url>: JSON-трек або пак (формат tracks/dev/*.json) без збірки;
//  - інакше ?tracks=<url> (сайт: /moto/tracks/dril.mrg) і поруч індекс назв — той самий
//    шлях з .json замість .mrg, [{ league, index, name, slug }]; без індексу — назви з .mrg;
//  - у `npm run dev` без пака сайту — дев-пак із src/assets (у прод-бандл не потрапляє).
import type { Config } from './config.ts'
import { decodeMrg, encodeMrg, type MrgPack } from './mrg.ts'
import { parsePackJson } from './trackJson.ts'

export interface LoadedPack {
  buffer: ArrayBuffer
  names: string[][]
}

interface IndexEntry {
  league: number
  index: number
  name: string
  slug: string
}

/** LevelLoader читає назву в .mrg як ASCII до 39 байт. */
const MRG_NAME = /^[\x20-\x7e]{1,39}$/

/** Помилка і для не-2xx, і для HTML: vite dev/preview на відсутній файл віддають index.html зі статусом 200. */
const fetchOk = async (url: string): Promise<Response> => {
  const res = await fetch(url)
  if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) {
    throw new Error(`${url}: файл не знайдено (HTTP ${res.status})`)
  }
  return res
}

const fromJson = async (url: string): Promise<LoadedPack> => {
  const pack = parsePackJson(await (await fetchOk(url)).json())
  // у .mrg ідуть ASCII-заглушки, українські назви JSON — одразу в списки
  const leagues = pack.leagues.map((l) => l.map((t, i) => (MRG_NAME.test(t.name) ? t : { ...t, name: `track ${i + 1}` })))
  return { buffer: encodeMrg({ leagues } as MrgPack), names: pack.leagues.map((l) => l.map((t) => t.name)) }
}

const readMrg = async (url: string): Promise<ArrayBuffer> => {
  try {
    return await (await fetchOk(url)).arrayBuffer()
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`${url} недоступний — граю дев-пак із src/assets`, error)
      const { default: devPackUrl } = await import('../assets/dev-pack.mrg?url')
      return await (await fetchOk(devPackUrl)).arrayBuffer()
    }
    throw error
  }
}

const indexUrlOf = (mrgUrl: string): string | null => {
  const url = new URL(mrgUrl, window.location.href)
  if (!url.pathname.endsWith('.mrg')) return null
  url.pathname = url.pathname.replace(/\.mrg$/, '.json')
  return url.href
}

/** Індекс назв поруч із паком; null — нема (404, не JSON, мережа): індекс необовʼязковий. */
const readIndex = async (mrgUrl: string): Promise<IndexEntry[] | null> => {
  const indexUrl = indexUrlOf(mrgUrl)
  if (indexUrl === null) return null
  try {
    return (await (await fetchOk(indexUrl)).json()) as IndexEntry[]
  } catch {
    return null
  }
}

/** Українські назви з індексу поверх ASCII-назв із .mrg; без індексу лишаються назви .mrg. */
const withIndexNames = (index: IndexEntry[] | null, names: string[][]): string[][] => {
  if (index === null) return names
  const out = names.map((l) => [...l])
  for (const e of index) {
    if (typeof e.name === 'string' && out[e.league]?.[e.index] !== undefined) out[e.league][e.index] = e.name
  }
  return out
}

export const loadPack = async (cfg: Config): Promise<LoadedPack> => {
  if (cfg.jsonUrl) return fromJson(cfg.jsonUrl)
  // пак і індекс назв — паралельно: кожна послідовна хвиля запитів на 3G ≈ RTT (бюджет спеки 1,5 с)
  const [buffer, index] = await Promise.all([readMrg(cfg.tracksUrl), readIndex(cfg.tracksUrl)])
  // '_' у назві .mrg двигун показує пробілом — так само в списках
  const names = decodeMrg(buffer).leagues.map((l) => l.map((t) => t.name.replaceAll('_', ' ')))
  return { buffer, names: withIndexNames(index, names) }
}
