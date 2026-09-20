// src/shell/config.ts — усе, що сайт передає грі, іде query-параметрами iframe.
export interface Config {
  tracksUrl: string
  ns: string
  lang: 'uk'
  theme: 'light' | 'dark'
  debug: boolean
  jsonUrl: string | null
}

export const readConfig = (search = window.location.search): Config => {
  const q = new URLSearchParams(search)
  return {
    tracksUrl: q.get('tracks') ?? './tracks/dril.mrg',
    ns: q.get('ns') ?? 'dril-moto',
    lang: 'uk',
    theme: q.get('theme') === 'dark' ? 'dark' : 'light',
    debug: q.has('debug'),
    jsonUrl: q.has('debug') ? q.get('json') : null,
  }
}
