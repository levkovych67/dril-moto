// scripts/check-progress.mjs — чиста логіка рекордів і відкриття.
//   node scripts/check-progress.mjs
import assert from 'node:assert/strict'
import { recordFinish, isTrackUnlocked, bestKey, emptyProgress } from '../src/shell/Progress.ts'

let n = 0
const check = (name, fn) => {
  fn()
  n += 1
  console.log('ok -', name)
}
const counts = [3, 3, 3]

check('на старті відкритий лише перший трек першої ліги', () => {
  const p = emptyProgress()
  assert.equal(isTrackUnlocked(p, 0, 0), true)
  assert.equal(isTrackUnlocked(p, 0, 1), false)
  assert.equal(isTrackUnlocked(p, 1, 0), false)
})

check('фініш відкриває наступний трек і записує рекорд', () => {
  const r = recordFinish(emptyProgress(), 0, 0, 12345, counts)
  assert.equal(r.isBest, true)
  assert.equal(r.unlockedNextTrack, true)
  assert.equal(r.unlockedNextLeague, false)
  assert.equal(isTrackUnlocked(r.progress, 0, 1), true)
  assert.equal(r.progress.best[bestKey(0, 0)], 12345)
})

check('гірший час не перезаписує рекорд, кращий — перезаписує', () => {
  let p = recordFinish(emptyProgress(), 0, 0, 10000, counts).progress
  const worse = recordFinish(p, 0, 0, 11000, counts)
  assert.equal(worse.isBest, false)
  assert.equal(worse.progress.best[bestKey(0, 0)], 10000)
  const better = recordFinish(p, 0, 0, 9000, counts)
  assert.equal(better.isBest, true)
  assert.equal(better.progress.best[bestKey(0, 0)], 9000)
})

check('останній трек ліги відкриває наступну лігу', () => {
  let p = emptyProgress()
  for (let t = 0; t < 3; t++) p = recordFinish(p, 0, t, 5000, counts).progress
  assert.equal(isTrackUnlocked(p, 1, 0), true)
  assert.equal(isTrackUnlocked(p, 1, 1), false)
  const last = recordFinish(p, 0, 2, 4000, counts)
  assert.equal(last.unlockedNextLeague, false, 'повторний фініш не відкриває двічі')
})

check('повторний фініш не відкриває треки понад кількість', () => {
  let p = emptyProgress()
  for (let i = 0; i < 5; i++) p = recordFinish(p, 0, 2, 5000, counts).progress
  assert.equal(p.unlockedTracks[0] <= 3, true)
})

console.log(`ok: ${n} checks`)
