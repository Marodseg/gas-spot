import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })

writeFileSync(new URL('../public/icons/icon-192.png', import.meta.url), png(192, false))
writeFileSync(new URL('../public/icons/icon-512.png', import.meta.url), png(512, false))
writeFileSync(new URL('../public/icons/icon-maskable-512.png', import.meta.url), png(512, true))

function png(size, maskable) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const [red, green, blue, alpha] = paint(x, y, size, maskable)
      const index = row + 1 + x * 4
      raw[index] = red
      raw[index + 1] = green
      raw[index + 2] = blue
      raw[index + 3] = alpha
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function paint(x, y, size, maskable) {
  const background = [12, 107, 92, 255]
  const paper = [244, 255, 251, 255]
  const inset = maskable ? size * 0.18 : size * 0.06
  const radius = size * 0.22
  if (!maskable && !insideRoundRect(x, y, size, radius, inset)) return [0, 0, 0, 0]
  const centerX = (size - 1) / 2
  const centerY = size * (maskable ? 0.46 : 0.42)
  const dx = x - centerX
  const dy = y - centerY
  const outer = size * 0.14
  if (dx * dx + dy * dy <= outer * outer) return paper
  const inner = size * 0.055
  if (dx * dx + dy * dy <= inner * inner) return background
  if (Math.abs(dx) <= size * 0.028 && dy > 0 && dy < size * 0.2) return paper
  return background
}

function insideRoundRect(x, y, size, radius, inset) {
  const left = inset
  const right = size - inset - 1
  const top = inset
  const bottom = size - inset - 1
  if (x < left || x > right || y < top || y > bottom) return false
  const nearX = x < left + radius ? left + radius : x > right - radius ? right - radius : x
  const nearY = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y
  const dx = x - nearX
  const dy = y - nearY
  return dx * dx + dy * dy <= radius * radius
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function crc32(buffer) {
  let crc = ~0
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}
