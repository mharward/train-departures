/**
 * Generate PWA icon PNGs from the source SVG logo.
 *
 * Usage:  node scripts/generate-icons.js
 *
 * Requires sharp (available via netlify-cli dependency).
 * Edit PADDING_RATIO to control how much space surrounds the logo.
 */

const path = require('path')

// Try to find sharp - installed as a nested dependency of netlify-cli
let sharp
try {
  sharp = require('sharp')
} catch {
  sharp = require(path.resolve(__dirname, '../node_modules/netlify-cli/node_modules/sharp'))
}

const SOURCE_SVG = path.resolve(__dirname, '../public/logo.svg')

// Fraction of the icon size used as padding on each side (0.22 = 22%)
const PADDING_RATIO = 0.22

const ICONS = [
  { size: 512, output: 'public/pwa-512x512.png' },
  { size: 192, output: 'public/pwa-192x192.png' },
  { size: 180, output: 'public/apple-touch-icon-180x180.png' },
]

async function generate({ size, output }) {
  const padding = Math.round(size * PADDING_RATIO)
  const logoSize = size - padding * 2

  const logo = await sharp(SOURCE_SVG, { density: 300 })
    .resize(logoSize, logoSize)
    .png()
    .toBuffer()

  const outputPath = path.resolve(__dirname, '..', output)
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, left: padding, top: padding }])
    .png()
    .toFile(outputPath)

  console.log(`Created ${output} (${size}x${size}, padding: ${padding}px)`)
}

Promise.all(ICONS.map(generate)).catch((err) => {
  console.error(err)
  process.exit(1)
})
