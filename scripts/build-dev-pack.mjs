// scripts/build-dev-pack.mjs — tracks/dev/*.json → src/assets/dev-pack.mrg.
// Дев-пак потрібен, щоб гра збиралась і запускалась без пака сайту.
// Правила геометрії (parseTrackJson) сюди підключає Task 3.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { encodeMrg } from '../src/shell/mrg.ts'

const dir = new URL('../tracks/dev/', import.meta.url)
const tracks = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
// три ліги: усі дев-треки в першій, по першому в решті — щоб LevelLoader мав що вантажити
const pack = { leagues: [tracks, [tracks[0]], [tracks[0]]] }
writeFileSync(new URL('../src/assets/dev-pack.mrg', import.meta.url), Buffer.from(encodeMrg(pack)))
console.log('ok - dev-pack.mrg:', tracks.map((t) => t.name).join(', '))
