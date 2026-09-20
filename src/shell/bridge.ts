// src/shell/bridge.ts — повідомлення сайту. Той самий origin: iframe /moto/index.html
// живе на домені сайту, тож targetOrigin = window.location.origin.
type MotoMessage =
  | { source: 'dril-moto'; type: 'ready'; version: string }
  | { source: 'dril-moto'; type: 'exit' }
  | { source: 'dril-moto'; type: 'finished'; league: number; track: number; timeMs: number; best: boolean }

const post = (msg: MotoMessage) => {
  if (window.parent !== window) window.parent.postMessage(msg, window.location.origin)
}

export const bridge = {
  ready: (version: string) => post({ source: 'dril-moto', type: 'ready', version }),
  exit: () => post({ source: 'dril-moto', type: 'exit' }),
  finished: (league: number, track: number, timeMs: number, best: boolean) => post({ source: 'dril-moto', type: 'finished', league, track, timeMs, best }),
}
