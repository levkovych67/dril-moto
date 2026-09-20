// src/shell/trackJson.ts — наш авторський формат треку (JSON) → MrgTrack.
// Координати в одиницях треку (цілі). y росте ВГОРУ (GameCanvas.addDy малює -y).
// Правила взяті з двигуна, перевірені scripts/sim-track.mjs на оригінальному паку:
// - x строго зростає: GameLevel.addPoint мовчки викидає точку з x ≤ попереднього;
// - |координата| ≤ 32767: (x << 16) >> 3 у GameLevel.addPointSimple переповнюється;
// - колеса стоять на висоті start.y в x = start.x ± 14; з перспективою двигун міряє
//   колесо на 8 одиниць нижче, внутрішній радіус колеса 5,8: ближче — вічний цикл у
//   GamePhysics.solvePhysicsStep (вкладка зависає), під землею — провал крізь трек;
// - старт-прапорець = друга точка правіше start.x, фініш = перша точка правіше
//   finish.x (LevelLoader.prepareLevelGeometry); якщо вони збігаються або фініш
//   лівіше старту, фініш ніколи не зарахується; finish.y двигун не читає.
import type { MrgPack, MrgTrack } from './mrg.ts'

const MAX_COORD = 32767
const WHEEL_DX = 14
const PERSPECTIVE_DY = 8
const MIN_WHEEL_GAP = 7
const START_HEIGHT: [number, number] = [15, 30]
const MIN_LEAD_IN = 40
const MIN_RUN_OUT = 150

type Point = [number, number]

const isPair = (v: unknown): v is Point =>
  Array.isArray(v) &&
  v.length === 2 &&
  v.every((n) => Number.isInteger(n) && Math.abs(n as number) <= MAX_COORD)

const groundY = (points: Point[], x: number): number => {
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [x0, y0] = points[i - 1]
      const [x1, y1] = points[i]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return Number.NaN
}

const distanceToGround = (points: Point[], x: number, y: number): number => {
  let best = Number.POSITIVE_INFINITY
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const dx = points[i][0] - x0
    const dy = points[i][1] - y0
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(x - x0 - t * dx, y - y0 - t * dy))
  }
  return best
}

const checkGeometry = (name: string, start: Point, finish: Point, points: Point[]): void => {
  for (let i = 1; i < points.length; i++) {
    if (points[i][0] <= points[i - 1][0]) throw new Error(`${name}: points[${i}] — x має строго зростати`)
  }
  if (start[0] - points[0][0] < MIN_LEAD_IN) throw new Error(`${name}: start.x має бути щонайменше на ${MIN_LEAD_IN} правіше першої точки`)
  if (points[points.length - 1][0] - finish[0] < MIN_RUN_OUT) throw new Error(`${name}: після finish.x потрібно щонайменше ${MIN_RUN_OUT} одиниць ламаної`)
  const between = points.filter(([x]) => x > start[0] && x <= finish[0]).length
  if (between < 2) throw new Error(`${name}: фініш має бути правіше старту, між ними щонайменше дві точки ламаної`)
  const height = start[1] - groundY(points, start[0])
  if (height < START_HEIGHT[0] || height > START_HEIGHT[1]) {
    throw new Error(`${name}: старт має бути на ${START_HEIGHT[0]}–${START_HEIGHT[1]} одиниць вище землі (y росте вгору), зараз ${height.toFixed(1)}`)
  }
  for (const dx of [-WHEEL_DX, WHEEL_DX]) {
    if (distanceToGround(points, start[0] + dx, start[1] - PERSPECTIVE_DY) < MIN_WHEEL_GAP) {
      throw new Error(`${name}: колесо в x=${start[0] + dx} на старті вʼязне в землі — підніми старт або вирівняй землю під ним`)
    }
  }
}

export const parseTrackJson = (json: unknown): MrgTrack => {
  const j = json as Partial<MrgTrack>
  const name = typeof j.name === 'string' ? j.name.trim() : ''
  if (name.length === 0 || [...name].length > 20) throw new Error('name: непорожній рядок до 20 символів')
  if (!isPair(j.start) || !isPair(j.finish)) throw new Error(`${name}: start/finish — пара цілих у межах ±${MAX_COORD}`)
  if (!Array.isArray(j.points) || j.points.length < 4 || !j.points.every(isPair)) {
    throw new Error(`${name}: points — щонайменше чотири пари цілих у межах ±${MAX_COORD}`)
  }
  checkGeometry(name, j.start, j.finish, j.points)
  return { name, start: [j.start[0], j.start[1]], finish: [j.finish[0], j.finish[1]], points: j.points.map((p) => [p[0], p[1]]) }
}

/** Пак: { leagues: [[track, …], [...], [...]] } або один трек → пак з цим треком у кожній лізі. */
export const parsePackJson = (json: unknown): MrgPack => {
  const j = json as { leagues?: unknown[] }
  if (!Array.isArray(j.leagues)) {
    const single = parseTrackJson(json)
    return { leagues: [[single], [single], [single]] }
  }
  if (j.leagues.length !== 3) throw new Error('leagues: рівно три ліги')
  const leagues = j.leagues.map((l) => (Array.isArray(l) ? l.map(parseTrackJson) : [])) as MrgPack['leagues']
  if (leagues[0].length === 0) throw new Error('перша ліга має містити хоча б один трек')
  return { leagues }
}
