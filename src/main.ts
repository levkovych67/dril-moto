import './shell/theme.css'
import './shell/shell.css'
import { GameShell } from './shell/GameShell.ts'
import { strings } from './shell/strings.uk.ts'

const root = document.getElementById('root')

if (!(root instanceof HTMLDivElement)) throw new Error('Missing #root container')
new GameShell().start(root).catch((error: unknown) => {
  console.error('Dril Moto failed to start', error)
  const errorView = document.createElement('p')
  errorView.className = 'error-view'
  errorView.setAttribute('role', 'alert')
  errorView.textContent = strings.error.startup
  root.replaceChildren(errorView)
})
