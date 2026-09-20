// scripts/png.mjs — мінімальний енкодер PNG (RGBA, без фільтрів) для скриптів,
// що генерують плейсхолдери й шаблони спрайтів. Залежностей у проєкті нема,
// тому zlib з node і власний CRC32.
import { deflateSync } from 'node:zlib'

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([len, typeAndData, crc])
}

/** Створює полотно width×height (RGBA), заповнене прозорим. */
export const createCanvas = (width, height) => ({ width, height, data: Buffer.alloc(width * height * 4) })

export const setPixel = (c, x, y, [r, g, b, a = 255]) => {
  if (x < 0 || y < 0 || x >= c.width || y >= c.height) return
  const i = (y * c.width + x) * 4
  c.data[i] = r
  c.data[i + 1] = g
  c.data[i + 2] = b
  c.data[i + 3] = a
}

export const fillRect = (c, x, y, w, h, color) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(c, xx, yy, color)
}

export const encodePng = (c) => {
  const raw = Buffer.alloc((c.width * 4 + 1) * c.height)
  for (let y = 0; y < c.height; y++) {
    raw[y * (c.width * 4 + 1)] = 0 // фільтр None
    c.data.copy(raw, y * (c.width * 4 + 1) + 1, y * c.width * 4, (y + 1) * c.width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(c.width, 0)
  ihdr.writeUInt32BE(c.height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Лінія Брезенгема від (x0, y0) до (x1, y1) включно; координати округлюються. */
export const drawLine = (c, x0, y0, x1, y1, color) => {
  let x = Math.round(x0)
  let y = Math.round(y0)
  const xEnd = Math.round(x1)
  const yEnd = Math.round(y1)
  const dx = Math.abs(xEnd - x)
  const dy = -Math.abs(yEnd - y)
  const sx = x < xEnd ? 1 : -1
  const sy = y < yEnd ? 1 : -1
  let err = dx + dy
  for (;;) {
    setPixel(c, x, y, color)
    if (x === xEnd && y === yEnd) return
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

/** Рамка 1px по периметру прямокутника. */
export const strokeRect = (c, x, y, w, h, color) => {
  fillRect(c, x, y, w, 1, color)
  fillRect(c, x, y + h - 1, w, 1, color)
  fillRect(c, x, y, 1, h, color)
  fillRect(c, x + w - 1, y, 1, h, color)
}
