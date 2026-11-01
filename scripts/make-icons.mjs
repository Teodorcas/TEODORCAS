/**
 * Renders scripts/icon.svg into every icon slot the site and the Android
 * project ship. Run it after editing the SVG:
 *
 *   node scripts/make-icons.mjs
 *
 * Sizes are not guesses — they were read off the existing PNGs, so a
 * re-run replaces like for like and the Android resource directories stay
 * valid.
 */
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** PWA / Apple touch / Bubblewrap source images. */
const targets = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['android-twa/icon-192.png', 192],
  ['android-twa/icon-512.png', 512],
  ['android-twa/store_icon.png', 512],
]

/**
 * Android resources. The launcher is the plain icon; the maskable is the
 * same artwork at the larger size Android crops it from; the splash is the
 * icon shown on the launch background.
 */
const densities = {
  mdpi: { launcher: 48, maskable: 72, splash: 200 },
  hdpi: { launcher: 72, maskable: 108, splash: 300 },
  xhdpi: { launcher: 96, maskable: 144, splash: 400 },
  xxhdpi: { launcher: 144, maskable: 216, splash: 500 },
  xxxhdpi: { launcher: 192, maskable: 288, splash: 600 },
}

const res = 'android-twa/app/src/main/res'
for (const [density, size] of Object.entries(densities)) {
  targets.push([`${res}/mipmap-${density}/ic_launcher.png`, size.launcher])
  targets.push([`${res}/mipmap-${density}/ic_maskable.png`, size.maskable])
  targets.push([`${res}/drawable-${density}/splash.png`, size.splash])
}

const svg = await readFile(path.join(root, 'scripts', 'icon.svg'))

for (const [rel, size] of targets) {
  const out = path.join(root, rel)
  await mkdir(path.dirname(out), { recursive: true })
  // Rasterise well above target size, then downscale — keeps the edges
  // crisp instead of interpolating a 512px source up to 600.
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(out)
  console.log(`${String(size).padStart(3)}x${size}  ${rel}`)
}

console.log(`\n${targets.length} icons written.`)
