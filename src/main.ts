import './shell/shell.css'
import { GameShell } from './shell/GameShell.ts'

const root = document.getElementById('root')

if (!(root instanceof HTMLDivElement)) throw new Error('Missing #root container')
new GameShell().start(root).catch((error: unknown) => {
  const pre = document.createElement('pre')
  pre.className = 'error-view'
  pre.textContent = error instanceof Error ? error.stack ?? error.message : String(error)
  root.replaceChildren(pre)
})
