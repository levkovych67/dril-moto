// src/shell/Progress.ts — рекорди й відкриття. Чиста логіка (recordFinish,
// isTrackUnlocked) без DOM/localStorage, щоб її ганяв scripts/check-progress.mjs;
// load/save/reset — тонкі обгортки над localStorage.
export interface Progress {
  best: Record<string, number>
  unlockedTracks: [number, number, number]
}

export const bestKey = (league: number, track: number): string => `${league}-${track}`

export const emptyProgress = (): Progress => ({ best: {}, unlockedTracks: [1, 0, 0] })

export const isTrackUnlocked = (p: Progress, league: number, track: number): boolean => track < p.unlockedTracks[league]

export const recordFinish = (
  p: Progress,
  league: number,
  track: number,
  timeMs: number,
  trackCounts: [number, number, number],
): { progress: Progress; isBest: boolean; unlockedNextTrack: boolean; unlockedNextLeague: boolean } => {
  const key = bestKey(league, track)
  const prev = p.best[key]
  const isBest = prev === undefined || timeMs < prev
  const best = isBest ? { ...p.best, [key]: timeMs } : { ...p.best }
  const unlocked: [number, number, number] = [...p.unlockedTracks]
  let unlockedNextTrack = false
  let unlockedNextLeague = false
  if (track + 1 < trackCounts[league] && unlocked[league] < track + 2) {
    unlocked[league] = track + 2
    unlockedNextTrack = true
  }
  if (track + 1 === trackCounts[league] && league + 1 < 3 && unlocked[league + 1] === 0) {
    unlocked[league + 1] = 1
    unlockedNextLeague = true
  }
  return { progress: { best, unlockedTracks: unlocked }, isBest, unlockedNextTrack, unlockedNextLeague }
}

const key = (ns: string) => `${ns}:progress:v1`

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

export const loadProgress = (ns: string): Progress => {
  try {
    const raw = localStorage.getItem(key(ns))
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as { best?: unknown; unlockedTracks?: unknown }
    const u = parsed.unlockedTracks
    if (!Array.isArray(u) || u.length !== 3 || !u.every(isCount)) return emptyProgress()
    if (typeof parsed.best !== 'object' || parsed.best === null || Array.isArray(parsed.best)) return emptyProgress()
    const best: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed.best)) {
      if (/^[0-2]-\d+$/.test(k) && typeof v === 'number' && v > 0) best[k] = v
    }
    return { best, unlockedTracks: [Math.max(1, u[0]), u[1], u[2]] }
  } catch {
    return emptyProgress()
  }
}

export const saveProgress = (ns: string, p: Progress): void => {
  try {
    localStorage.setItem(key(ns), JSON.stringify(p))
  } catch {
    /* приватний режим — прогрес живе лише в памʼяті */
  }
}

export const resetProgress = (ns: string): void => {
  try {
    localStorage.removeItem(key(ns))
  } catch {
    /* ignore */
  }
}
