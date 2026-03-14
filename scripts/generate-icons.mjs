/**
 * Pure-Node PNG icon generator (no external deps).
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// CRC32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1)
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.concat([typeBytes, data])
  const crcVal = Buffer.allocUnsafe(4)
  crcVal.writeUInt32BE(crc32(crcBuf), 0)
  return Buffer.concat([len, typeBytes, data, crcVal])
}

function createPng(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit depth, color type (2=RGB), compression, filter, interlace
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // Image data: each row has a filter byte (0) followed by RGB pixels
  const rowSize = 1 + size * 3
  const raw = Buffer.allocUnsafe(size * rowSize)

  // Draw rounded rect background + simple "B" letter
  const corner = Math.floor(size * 0.2)

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0 // filter byte
    for (let x = 0; x < size; x++) {
      const off = y * rowSize + 1 + x * 3
      // Determine if pixel is inside rounded rect
      const inShape = isInsideRoundedRect(x, y, size, corner)
      if (!inShape) {
        // transparent → white bg for Apple touch icon
        raw[off] = 255; raw[off+1] = 255; raw[off+2] = 255
      } else {
        // Check if pixel is part of "B2" letter outline
        const letterPixel = isLetterPixel(x, y, size)
        if (letterPixel) {
          raw[off] = 255; raw[off+1] = 255; raw[off+2] = 255
        } else {
          raw[off] = r; raw[off+1] = g; raw[off+2] = b
        }
      }
    }
  }

  const idat = deflateSync(raw, { level: 6 })
  const iend = Buffer.alloc(0)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', iend),
  ])
}

function isInsideRoundedRect(x, y, size, r) {
  // Check corners
  if (x < r && y < r) return dist(x, y, r, r) <= r
  if (x > size-1-r && y < r) return dist(x, y, size-1-r, r) <= r
  if (x < r && y > size-1-r) return dist(x, y, r, size-1-r) <= r
  if (x > size-1-r && y > size-1-r) return dist(x, y, size-1-r, size-1-r) <= r
  return true
}

function dist(x, y, cx, cy) {
  return Math.sqrt((x-cx)**2 + (y-cy)**2)
}

function isLetterPixel(px, py, size) {
  // Draw a simple stylized "B" using normalized coordinates
  const nx = px / size  // 0..1
  const ny = py / size  // 0..1

  // Center the "B" letter in a region of the icon
  const padding = 0.2
  const lx = (nx - padding) / (1 - 2*padding)  // 0..1 within letter box
  const ly = (ny - padding) / (1 - 2*padding)

  if (lx < 0 || lx > 1 || ly < 0 || ly > 1) return false

  const thickness = 0.12
  const stemW = 0.12

  // Vertical stem (left)
  if (lx < stemW && ly >= 0 && ly <= 1) return true

  // Top horizontal bar
  if (ly < thickness && lx >= stemW && lx <= 0.8) return true

  // Middle horizontal bar
  if (ly > 0.5 - thickness/2 && ly < 0.5 + thickness/2 && lx >= stemW && lx <= 0.75) return true

  // Bottom horizontal bar
  if (ly > 1 - thickness && lx >= stemW && lx <= 0.8) return true

  // Top bump (right side of B)
  const topBumpCX = 0.72, topBumpCY = 0.25, topBumpRX = 0.28, topBumpRY = 0.27
  if (isOnEllipseOutline(lx, ly, topBumpCX, topBumpCY, topBumpRX, topBumpRY, thickness)) return true

  // Bottom bump
  const botBumpCX = 0.76, botBumpCY = 0.75, botBumpRX = 0.32, botBumpRY = 0.27
  if (isOnEllipseOutline(lx, ly, botBumpCX, botBumpCY, botBumpRX, botBumpRY, thickness)) return true

  return false
}

function isOnEllipseOutline(x, y, cx, cy, rx, ry, thickness) {
  // Only right half of ellipse (x >= cx)
  if (x < cx) return false
  const val = ((x - cx)/rx)**2 + ((y - cy)/ry)**2
  return val >= (1 - thickness*1.5) && val <= (1 + thickness*1.5)
}

// Colors: indigo #4F46E5 = rgb(79, 70, 229)
const R = 79, G = 70, B = 229

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of SIZES) {
  const png = createPng(size, R, G, B)
  writeFileSync(path.join(outDir, `icon-${size}.png`), png)
  console.log(`✓ Generated icon-${size}.png (${png.length} bytes)`)
}

console.log('\nAll icons generated in public/icons/')
