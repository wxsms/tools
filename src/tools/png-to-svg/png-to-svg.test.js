import { describe, it, expect } from 'vitest'
import {
  buildTraceOptions,
  DEFAULT_PARAMS,
  removeBackground,
  sampleBorderColor,
  toleranceForSmoothness,
  vectorize,
} from './png-to-svg.js'

// Build RGBA image data from a per-pixel color function.
function makeImage(width, height, colorAt) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = colorAt(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return { width, height, data }
}

const WHITE = [255, 255, 255]
const RED = [220, 30, 60]

function redSquareOnWhite(size = 32, inset = 8) {
  return makeImage(size, size, (x, y) =>
    x >= inset && x < size - inset && y >= inset && y < size - inset ? RED : WHITE)
}

describe('toleranceForSmoothness', () => {
  it('maps the low end to a tight tolerance', () => {
    expect(toleranceForSmoothness(0)).toBe(0.05)
  })

  it('maps the high end to a loose tolerance', () => {
    expect(toleranceForSmoothness(10)).toBe(12)
  })

  it('clamps out-of-range values', () => {
    expect(toleranceForSmoothness(-5)).toBe(0.05)
    expect(toleranceForSmoothness(99)).toBe(12)
  })

  it('increases monotonically', () => {
    for (let i = 1; i <= 10; i++) {
      expect(toleranceForSmoothness(i)).toBeGreaterThan(toleranceForSmoothness(i - 1))
    }
  })
})

describe('buildTraceOptions', () => {
  it('applies the smoothness value to both line and curve tolerance', () => {
    const options = buildTraceOptions({ ...DEFAULT_PARAMS, smoothness: 5 })
    expect(options.ltres).toBe(1)
    expect(options.qtres).toBe(1)
  })

  it('clamps the color count into imagetracer’s usable range', () => {
    expect(buildTraceOptions({ ...DEFAULT_PARAMS, colors: 1 }).numberofcolors).toBe(2)
    expect(buildTraceOptions({ ...DEFAULT_PARAMS, colors: 999 }).numberofcolors).toBe(64)
  })

  it('clamps a negative noise filter to zero', () => {
    expect(buildTraceOptions({ ...DEFAULT_PARAMS, noiseFilter: -3 }).pathomit).toBe(0)
  })

  it('always requests a viewBox and no debug output', () => {
    const options = buildTraceOptions(DEFAULT_PARAMS)
    expect(options.viewbox).toBe(true)
    expect(options.desc).toBe(false)
    expect(options.lcpr).toBe(0)
    expect(options.qcpr).toBe(0)
  })
})

describe('sampleBorderColor', () => {
  it('picks the most common border color', () => {
    expect(sampleBorderColor(redSquareOnWhite())).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('ignores fully transparent border pixels', () => {
    const image = makeImage(8, 8, () => [0, 0, 0, 0])
    expect(sampleBorderColor(image)).toBeNull()
  })
})

describe('removeBackground', () => {
  it('clears alpha on border-connected pixels', () => {
    const image = redSquareOnWhite(32, 8)
    const result = removeBackground(image)
    expect(result.imageData.data[3]).toBe(0)
    // center of the square stays opaque
    const center = (16 * 32 + 16) * 4
    expect(result.imageData.data[center + 3]).toBe(255)
  })

  it('keeps enclosed regions of the background color', () => {
    const image = makeImage(32, 32, (x, y) => {
      const outer = x >= 4 && x < 28 && y >= 4 && y < 28
      const inner = x >= 12 && x < 20 && y >= 12 && y < 20
      if (inner) return WHITE
      return outer ? RED : WHITE
    })
    const result = removeBackground(image)
    const inner = (16 * 32 + 16) * 4
    expect(result.imageData.data[inner + 3]).toBe(255)
  })

  it('does not mutate the input image', () => {
    const image = redSquareOnWhite(32, 8)
    const before = Array.from(image.data.slice(0, 4))
    removeBackground(image)
    expect(Array.from(image.data.slice(0, 4))).toEqual(before)
  })

  it('tracks how many pixels were removed', () => {
    const result = removeBackground(redSquareOnWhite(32, 8))
    expect(result.removed).toBeGreaterThan(0)
    expect(result.removed).toBeLessThan(32 * 32)
  })

  it('returns the source unchanged when there is no background to sample', () => {
    const image = makeImage(8, 8, () => [0, 0, 0, 0])
    const result = removeBackground(image)
    expect(result.removed).toBe(0)
    expect(result.background).toBeNull()
  })
})

describe('vectorize', () => {
  it('produces an SVG root element', () => {
    const { svg } = vectorize(redSquareOnWhite(32, 8), DEFAULT_PARAMS, { width: 32, height: 32 })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('writes the source dimensions on the root element', () => {
    const { svg } = vectorize(redSquareOnWhite(32, 8), DEFAULT_PARAMS, { width: 640, height: 480 })
    expect(svg).toContain('width="640"')
    expect(svg).toContain('height="480"')
  })

  it('emits one path per visible color layer and drops the background', () => {
    const { svg, pathCount } = vectorize(redSquareOnWhite(32, 8), DEFAULT_PARAMS, { width: 32, height: 32 })
    expect(pathCount).toBe(1)
    expect((svg.match(/<path /g) || []).length).toBe(1)
  })

  it('keeps the background layer when removal is off', () => {
    const params = { ...DEFAULT_PARAMS, removeBackground: false }
    const { pathCount } = vectorize(redSquareOnWhite(32, 8), params, { width: 32, height: 32 })
    expect(pathCount).toBe(2)
  })

  it('keeps holes open by drawing them inside the owning path', () => {
    const image = makeImage(32, 32, (x, y) => {
      const r = Math.hypot(x - 16, y - 16)
      if (r > 12) return WHITE
      return r < 5 ? [255, 255, 255] : RED
    })
    const { svg } = vectorize(image, DEFAULT_PARAMS, { width: 32, height: 32 })
    const path = svg.match(/<path [^>]*d="([^"]*)"/)[1]
    // a ring traced as one path has two subpaths: outer contour + inner hole
    expect((path.match(/M\s/g) || []).length).toBe(2)
  })

  it('never emits fully transparent layers', () => {
    const image = makeImage(16, 16, (x, y) =>
      x >= 4 && x < 12 && y >= 4 && y < 12 ? RED : [0, 0, 0, 0])
    const { svg } = vectorize(image, DEFAULT_PARAMS, { width: 16, height: 16 })
    expect(svg).not.toContain('opacity="0')
  })

  it('returns an empty string when nothing is left to draw', () => {
    const blank = makeImage(16, 16, () => WHITE)
    const { svg, pathCount } = vectorize(blank, DEFAULT_PARAMS, { width: 16, height: 16 })
    expect(pathCount).toBe(0)
    expect(svg).toBe('')
  })
})
