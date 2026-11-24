// Run with: bun plugins/theme-backgrounds/js/lib/crop.test.ts
import assert from 'node:assert/strict'
import { centreOf, cropRect, croppedUrl } from './crop'

const view = { width: 4000, height: 3000, zoom: 1, x: 0.5, y: 0.5 }

// A 9:16 screen on a landscape photo uses the full height and a centred strip of width.
const rect = cropRect(view, 9 / 16)
assert.equal(rect.height, 3000)
assert.equal(rect.width, 1687.5)
assert.equal(rect.left, (4000 - 1687.5) / 2)
assert.equal(rect.top, 0)

// Zoom halves the visible part, and a centre past the edge is held inside the image.
const zoomed = cropRect({ ...view, zoom: 2, x: 0, y: 1 }, 9 / 16)
assert.equal(zoomed.width, 843.75)
assert.equal(zoomed.left, 0)
assert.equal(zoomed.top + zoomed.height, 3000)
assert.equal(centreOf(view, zoomed).x, 843.75 / 2 / 4000)

// A portrait photo on a taller screen fills the width.
const tall = cropRect({ width: 1000, height: 1000, zoom: 1, x: 0.5, y: 0.5 }, 0.5)
assert.deepEqual([tall.width, tall.height], [500, 1000])

// The link crops inside the resized image, never past its edge.
const url = new URL(croppedUrl({ ...view, url: 'https://example.com/a b.png', x: 1, y: 1 }, 9 / 16))
const q = (k: string) => Number(url.searchParams.get(k))
assert.equal(url.searchParams.get('url'), 'https://example.com/a b.png')
assert.ok(q('cx') + q('cw') <= q('w'))
assert.ok(q('cw') <= 1440)
assert.equal(q('w'), Math.round(4000 * (1440 / 1687.5)))

console.log('crop ok')
