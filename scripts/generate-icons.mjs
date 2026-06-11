/**
 * Génère toutes les icônes PWA de Foulée.
 * Fond terracotta opaque #C5402C, lettre F blanche centrée.
 * Usage : node scripts/generate-icons.mjs
 */

import sharp from 'sharp'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')

const BG = { r: 197, g: 64, b: 44, alpha: 1 } // #C5402C

function makeSvgF(size) {
  const fontSize = Math.round(size * 0.6)
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="50%" y="54%"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >F</text>
</svg>`)
}

async function generateIcon(size, filename) {
  const svg = makeSvgF(size)
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toFile(resolve(publicDir, filename))
  console.log(`✓ ${filename} (${size}×${size})`)
}

await generateIcon(180, 'icon-180.png')
await generateIcon(192, 'icon-192.png')
await generateIcon(512, 'icon-512.png')
await generateIcon(180, 'apple-touch-icon.png')
await generateIcon(180, 'apple-touch-icon-precomposed.png')

console.log('Done.')
