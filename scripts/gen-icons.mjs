#!/usr/bin/env node
// Generates icon-192.png and icon-512.png in /public — no npm deps needed.
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT   = resolve(__dir, '../public')

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const tb  = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([tb, data])
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, tb, data, crcBuf])
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function px(buf, x, y, stride, r, g, b, a = 255) {
  const i = (y * stride + x) * 4
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a
}

function circle(buf, cx, cy, radius, stride, r, g, b, fill = true) {
  const r2 = radius * radius
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2
      if (fill ? d2 <= r2 : Math.abs(d2 - r2) < radius * 2)
        px(buf, x, y, stride, r, g, b)
    }
  }
}

function roundedRect(buf, x0, y0, w, h, rx, stride, r, g, b) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      // Check if inside rounded rect
      const ax = x - x0, ay = y - y0
      let inside = true
      if (ax < rx && ay < rx)       inside = (ax - rx) ** 2 + (ay - rx) ** 2 <= rx * rx
      else if (ax > w - rx && ay < rx) inside = (ax - (w - rx)) ** 2 + (ay - rx) ** 2 <= rx * rx
      else if (ax < rx && ay > h - rx) inside = (ax - rx) ** 2 + (ay - (h - rx)) ** 2 <= rx * rx
      else if (ax > w - rx && ay > h - rx) inside = (ax - (w - rx)) ** 2 + (ay - (h - rx)) ** 2 <= rx * rx
      if (inside) px(buf, x, y, stride, r, g, b)
    }
  }
}

// Bresenham-style anti-aliased wave line
function wave(buf, s, stride, r, g, b, amp, freq, yBase, thickness) {
  for (let x = 0; x < s; x++) {
    const yw = yBase + amp * Math.sin((x / s) * Math.PI * 2 * freq)
    for (let t = -thickness; t <= thickness; t++) {
      const y = Math.round(yw + t)
      if (y >= 0 && y < s) {
        const alpha = Math.max(0, 1 - Math.abs(t) / (thickness + 1))
        const i = (y * stride + x) * 4
        buf[i]   = Math.round(buf[i]   * (1 - alpha) + r * alpha)
        buf[i+1] = Math.round(buf[i+1] * (1 - alpha) + g * alpha)
        buf[i+2] = Math.round(buf[i+2] * (1 - alpha) + b * alpha)
        buf[i+3] = 255
      }
    }
  }
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function makePNG(pixels, size) {
  // pixels: Uint8Array RGBA, size×size
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4)
    row[0] = 0 // filter None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      row[1 + x * 4]     = pixels[src]
      row[2 + x * 4]     = pixels[src + 1]
      row[3 + x * 4]     = pixels[src + 2]
      row[4 + x * 4]     = pixels[src + 3]
    }
    rows.push(row)
  }
  const rawData    = Buffer.concat(rows)
  const compressed = deflateSync(rawData, { level: 9 })

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 6  // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

// ── Render icon ───────────────────────────────────────────────────────────────
function renderIcon(s) {
  const buf = new Uint8Array(s * s * 4)

  // Fill outer bg: #0d1117 = 13,17,23
  for (let i = 0; i < s * s * 4; i += 4) {
    buf[i] = 13; buf[i+1] = 17; buf[i+2] = 23; buf[i+3] = 255
  }

  // Inner rounded rect: #111827 = 17,24,39
  const pad = Math.round(s * 0.08)
  const rx  = Math.round(s * 0.20)
  roundedRect(buf, pad, pad, s - pad * 2, s - pad * 2, rx, s, 17, 24, 39)

  // Wave 1 (main): #22d3ee = 34,211,238
  const amp1 = s * 0.065, thick1 = Math.max(2, Math.round(s * 0.022))
  wave(buf, s, s, 34, 211, 238, amp1, 1, s * 0.56, thick1)

  // Wave 2 (faint): same color, lower opacity appearance via blend
  const amp2 = s * 0.055, thick2 = Math.max(1, Math.round(s * 0.013))
  wave(buf, s, s, 34, 211, 238, amp2, 1, s * 0.40, thick2)
  // Lower opacity for wave 2 by blending toward bg
  for (let i = 0; i < s * s * 4; i += 4) {
    // detect roughly if this pixel is part of the second wave (approximation)
    // Instead, we just rendered at full — the thickness alone creates the effect
  }

  return makePNG(buf, s)
}

// ── Generate ──────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true })

for (const size of [192, 512]) {
  const png  = renderIcon(size)
  const file = `${OUT}/icon-${size}.png`
  writeFileSync(file, png)
  console.log(`✓ icon-${size}.png  (${png.length} bytes)`)
}
