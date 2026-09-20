// src/shell/bridge.ts — повідомлення сайту. Той самий origin: iframe /moto/index.html
// живе на домені сайту, тож targetOrigin = window.location.origin.
type MotoMessage =
  | { source: 'dril-moto'; type: 'ready'; version: string }
  | { source: 'dril-moto'; type: 'exit' }
  | { source: 'dril-moto'; type: 'finished'; finishId: string; league: number; track: number; timeMs: number; best: boolean }

const post = (msg: MotoMessage) => {
  if (window.parent !== window) window.parent.postMessage(msg, window.location.origin)
}

const finishId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const bridge = {
  ready: (version: string) => post({ source: 'dril-moto', type: 'ready', version }),
  exit: () => post({ source: 'dril-moto', type: 'exit' }),
  finished: (league: number, track: number, timeMs: number, best: boolean) => post({ source: 'dril-moto', type: 'finished', finishId: finishId(), league, track, timeMs, best }),
}
