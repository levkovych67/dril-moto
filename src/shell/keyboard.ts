const KEY_TO_CODE = new Map<string, number>([
  ['ArrowUp', 1],
  ['ArrowDown', 6],
  ['ArrowLeft', 2],
  ['ArrowRight', 5],
])

export interface KeyboardTarget {
  isRacing(): boolean
  isPaused(): boolean
  press(code: number): void
  release(code: number): void
  releaseAll(): void
  pause(): void
  resume(): void
}

export const bindKeyboard = (target: KeyboardTarget): void => {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (target.isRacing()) target.pause()
      else if (target.isPaused()) target.resume()
      else return
      e.preventDefault()
      return
    }
    const code = KEY_TO_CODE.get(e.code)
    if (code === undefined || !target.isRacing()) return
    e.preventDefault()
    target.press(code)
  })
  window.addEventListener('keyup', (e) => {
    const code = KEY_TO_CODE.get(e.code)
    if (code === undefined) return
    target.release(code)
    if (target.isRacing()) e.preventDefault()
  })
  window.addEventListener('blur', () => target.releaseAll())
}
