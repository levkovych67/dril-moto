// src/shell/TouchControls.ts — чотири зони внизу екрана → коди дій двигуна.
// pointer capture на кожній кнопці: палець може зʼїхати, не відпускаючи дії;
// мультитач — кожен pointerId живе окремо. Показує RaceSession лише за (pointer: coarse).
import { strings } from './strings.uk.ts'
import { el } from './screens/dom.ts'

const LEAN_BACK = 2
const LEAN_FORWARD = 5
const GAS = 1
const BRAKE = 6

export class TouchControls {
  readonly root = el('div', 'touch')
  private readonly active = new Map<number, number>() // pointerId → code
  private readonly press: (code: number) => void
  private readonly release: (code: number) => void

  constructor(press: (code: number) => void, release: (code: number) => void) {
    this.press = press
    this.release = release
    const c = strings.controls
    const left = el('div', 'touch-group')
    const right = el('div', 'touch-group')
    left.append(this.zone(c.back, c.backAria, 'touch-btn', LEAN_BACK), this.zone(c.forward, c.forwardAria, 'touch-btn', LEAN_FORWARD))
    right.append(this.zone(c.brake, c.brakeAria, 'touch-btn', BRAKE), this.zone(c.gas, c.gasAria, 'touch-btn touch-gas', GAS))
    this.root.append(left, right)
    this.root.hidden = true
    this.root.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private isHeld(code: number): boolean {
    for (const held of this.active.values()) if (held === code) return true
    return false
  }

  private zone(label: string, ariaLabel: string, className: string, code: number): HTMLButtonElement {
    const b = el('button', className, label)
    b.type = 'button'
    b.setAttribute('aria-label', ariaLabel)
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      b.setPointerCapture(e.pointerId)
      this.active.set(e.pointerId, code)
      b.classList.add('is-down')
      this.press(code)
    })
    const up = (e: PointerEvent) => {
      if (this.active.get(e.pointerId) !== code) return
      this.active.delete(e.pointerId)
      if (this.isHeld(code)) return // другий палець ще тримає ту саму кнопку
      b.classList.remove('is-down')
      this.release(code)
    }
    b.addEventListener('pointerup', up)
    b.addEventListener('pointercancel', up)
    b.addEventListener('lostpointercapture', up)
    return b
  }

  show(): void {
    this.root.hidden = false
  }

  hide(): void {
    this.releaseAll()
    this.root.hidden = true
  }

  releaseAll(): void {
    for (const code of new Set(this.active.values())) this.release(code)
    this.active.clear()
    this.root.querySelectorAll('.is-down').forEach((n) => n.classList.remove('is-down'))
  }
}
