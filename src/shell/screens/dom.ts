// src/shell/screens/dom.ts — крихітні помічники, щоб екрани читались як розмітка.
export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

export const button = (label: string, className: string, onClick: () => void): HTMLButtonElement => {
  const b = el('button', className, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

/** Екран — контейнер, що вміє показатись/сховатись; вміст перебудовується при показі. */
export abstract class Screen {
  readonly root = el('section', 'screen')

  protected constructor(id: string) {
    this.root.dataset.screen = id
    this.root.hidden = true
  }

  abstract render(): void

  show(): void {
    this.root.replaceChildren()
    this.render()
    this.root.hidden = false
    // Enter/пробіл одразу підтверджують першу доступну кнопку екрана (spec, «Керування»)
    this.root.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
  }

  hide(): void {
    this.root.hidden = true
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Замок закритої ліги чи треку (spec, «Потік екранів», п. 3–4). Колір — currentColor, тобто токен тексту. */
export const lockIcon = (): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'lock')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('aria-hidden', 'true')
  const shackle = document.createElementNS(SVG_NS, 'path')
  shackle.setAttribute('d', 'M5 7V5a3 3 0 0 1 6 0v2')
  shackle.setAttribute('fill', 'none')
  shackle.setAttribute('stroke', 'currentColor')
  shackle.setAttribute('stroke-width', '1.5')
  const body = document.createElementNS(SVG_NS, 'rect')
  body.setAttribute('x', '3')
  body.setAttribute('y', '7')
  body.setAttribute('width', '10')
  body.setAttribute('height', '7')
  body.setAttribute('rx', '1.5')
  body.setAttribute('fill', 'currentColor')
  svg.append(shackle, body)
  return svg
}
