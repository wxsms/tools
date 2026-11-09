import ImageTracer from 'imagetracerjs'

// Tracing a large, noisy bitmap is slow and produces enormous SVG, so the bitmap is
// downscaled to this longest edge before tracing. The SVG keeps the original size.
export const MAX_TRACE_DIM = 1024

// `smoothness` slider (0-10) mapped to imagetracer's line/quadratic error tolerance.
// Small tolerance = faithful to every pixel edge, large tolerance = fewer, rounder nodes.
const SMOOTH_STEPS = [0.05, 0.1, 0.2, 0.35, 0.6, 1, 1.8, 3, 5, 8, 12]

export const DEFAULT_PARAMS = {
  colors: 16,
  smoothness: 5,
  noiseFilter: 8,
  removeBackground: true,
}

export function toleranceForSmoothness(smoothness) {
  const index = Math.max(0, Math.min(SMOOTH_STEPS.length - 1, Math.round(smoothness)))
  return SMOOTH_STEPS[index]
}

export function buildTraceOptions({ colors, smoothness, noiseFilter }) {
  const tolerance = toleranceForSmoothness(smoothness)
  return {
    // color quantization
    colorsampling: 2,
    numberofcolors: Math.max(2, Math.min(64, Math.round(colors))),
    mincolorratio: 0,
    colorquantcycles: 3,
    // tracing
    ltres: tolerance,
    qtres: tolerance,
    pathomit: Math.max(0, Math.round(noiseFilter)),
    rightangleenhance: true,
    // output
    layering: 0,
    strokewidth: 1,
    linefilter: false,
    scale: 1,
    roundcoords: 2,
    viewbox: true,
    desc: false,
    // control-point debug output, off
    lcpr: 0,
    qcpr: 0,
    blurradius: 0,
    blurdelta: 20,
  }
}

// Most common color along the image border, used as the background to flood out.
// Channels are bucketed to 16 levels so anti-aliased edges still land together.
export function sampleBorderColor({ width, height, data }) {
  const buckets = new Map()
  const add = (x, y) => {
    const i = (y * width + x) * 4
    if (data[i + 3] < 16) return
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 }
    bucket.count++
    bucket.r += data[i]
    bucket.g += data[i + 1]
    bucket.b += data[i + 2]
    buckets.set(key, bucket)
  }
  for (let x = 0; x < width; x++) {
    add(x, 0)
    add(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    add(0, y)
    add(width - 1, y)
  }
  let best = null
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket
  }
  if (!best) return null
  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count),
  }
}

// Flood fill from the border over pixels close to the border color, making them
// transparent. Enclosed regions of the same color (an eye white inside a logo) stay.
//
// Guard: a subject that touches the border can be the most common border color
// itself, and removing that color would erase it. Such a color dominates the border
// yet owns no corner, so it is the subject and removal is skipped.
export const MIN_BORDER_SHARE = 0.5
export const MAX_REMOVED_RATIO = 0.995

export function removeBackground(imageData, { tolerance = 32 } = {}) {
  const { width, height } = imageData
  const source = imageData.data
  const data = new Uint8ClampedArray(source)
  const background = sampleBorderColor(imageData)
  const result = { imageData: { width, height, data }, background, removed: 0, skipped: false, skipReason: '' }
  if (!background) return result

  const matches = i =>
    source[i + 3] < 16 ||
    (Math.abs(source[i] - background.r) <= tolerance &&
      Math.abs(source[i + 1] - background.g) <= tolerance &&
      Math.abs(source[i + 2] - background.b) <= tolerance)

  if (borderColorIsSubject(imageData, background, tolerance)) {
    return { ...result, imageData: { width, height, data: source }, skipped: true, skipReason: 'subject' }
  }

  const visited = new Uint8Array(width * height)
  const stack = []
  const push = (x, y) => {
    const pixel = y * width + x
    if (visited[pixel] || !matches(pixel * 4)) return
    visited[pixel] = 1
    stack.push(pixel)
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    push(0, y)
    push(width - 1, y)
  }

  while (stack.length) {
    const pixel = stack.pop()
    data[pixel * 4 + 3] = 0
    result.removed++
    const x = pixel % width
    const y = (pixel - x) / width
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }

  // Removing nearly everything from a multi-color image means the sampled color was
  // the subject, not a background; keep the original so the output is not empty.
  // A uniform image is all-border by definition and an empty trace is correct there.
  if (result.removed > width * height * MAX_REMOVED_RATIO && !isUniform(imageData, background, tolerance)) {
    return { ...result, imageData: { width, height, data: source }, removed: 0, skipped: true, skipReason: 'subject' }
  }

  return result
}

// Every opaque pixel is within tolerance of `color`.
function isUniform({ width, height, data }, color, tolerance) {
  const total = width * height
  for (let pixel = 0; pixel < total; pixel++) {
    const i = pixel * 4
    if (data[i + 3] < 16) continue
    if (Math.abs(data[i] - color.r) > tolerance ||
      Math.abs(data[i + 1] - color.g) > tolerance ||
      Math.abs(data[i + 2] - color.b) > tolerance) return false
  }
  return true
}

// True when the sampled border color is the subject rather than a background:
// it dominates the border yet owns no corner, meaning it runs through the frame
// instead of surrounding it.
function borderColorIsSubject({ width, height, data }, background, tolerance) {
  const sameColor = i =>
    Math.abs(data[i] - background.r) <= tolerance &&
    Math.abs(data[i + 1] - background.g) <= tolerance &&
    Math.abs(data[i + 2] - background.b) <= tolerance

  let borderPixels = 0
  let matching = 0
  const sampleBorder = (x, y) => {
    const i = (y * width + x) * 4
    if (data[i + 3] < 16) return
    borderPixels++
    if (sameColor(i)) matching++
  }
  for (let x = 0; x < width; x++) {
    sampleBorder(x, 0)
    sampleBorder(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    sampleBorder(0, y)
    sampleBorder(width - 1, y)
  }
  if (borderPixels === 0 || matching / borderPixels <= MIN_BORDER_SHARE) return false

  const size = Math.max(1, Math.round(Math.min(width, height) * 0.08))
  const corners = [[0, 0], [width - size, 0], [0, height - size], [width - size, height - size]]
  return corners.every(([ox, oy]) => {
    let inCorner = 0
    let cornerMatching = 0
    for (let y = oy; y < oy + size; y++) {
      for (let x = ox; x < ox + size; x++) {
        inCorner++
        if (sameColor((y * width + x) * 4)) cornerMatching++
      }
    }
    return cornerMatching / inCorner < 0.5
  })
}

// Initial palette for a flood-filled image: one slot reserved for the removed
// background, the rest taken from the most frequent opaque colors. Without this,
// the many transparent pixels outvote the enclosed regions and drag their clusters
// to alpha 0, which the layer filter then drops. Sampling by frequency rather than
// by stride keeps small-but-significant colors (an eye white) on large images.
export function sampleOpaquePalette({ width, height, data }, count) {
  const buckets = new Map()
  const total = width * height
  for (let pixel = 0; pixel < total; pixel++) {
    const i = pixel * 4
    if (data[i + 3] < 16) continue
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 }
    bucket.count++
    bucket.r += data[i]
    bucket.g += data[i + 1]
    bucket.b += data[i + 2]
    buckets.set(key, bucket)
  }
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map(({ count: n, r, g, b }) => ({
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
      a: 255,
    }))
}

/**
 * Trace RGBA image data into an SVG string.
 * `width` / `height` are the original image size, written on the root element so the
 * vector keeps the source dimensions while the viewBox stays in trace coordinates.
 */
export function vectorize(imageData, params, { width, height } = {}) {
  const prepared = params.removeBackground
    ? removeBackground(imageData)
    : { imageData, background: null, removed: 0, skipped: false, skipReason: '' }
  const options = buildTraceOptions(params)
  const backgroundRemoved = params.removeBackground && !prepared.skipped && !!prepared.background
  if (backgroundRemoved) {
    const { r, g, b } = prepared.background
    options.pal = [{ r, g, b, a: 0 }, ...sampleOpaquePalette(prepared.imageData, options.numberofcolors - 1)]
  }
  const tracedata = ImageTracer.imagedataToTracedata(prepared.imageData, options)

  let body = ''
  let pathCount = 0
  let layerCount = 0
  for (let layerIndex = 0; layerIndex < tracedata.layers.length; layerIndex++) {
    // Layers left transparent by the background flood fill carry no visible shape.
    if (tracedata.palette[layerIndex].a < 16) continue
    const layer = tracedata.layers[layerIndex]
    let used = false
    for (let pathIndex = 0; pathIndex < layer.length; pathIndex++) {
      if (layer[pathIndex].isholepath) continue
      const path = ImageTracer.svgpathstring(tracedata, layerIndex, pathIndex, options)
      if (!path) continue
      body += path
      pathCount++
      used = true
    }
    if (used) layerCount++
  }

  const traceWidth = tracedata.width
  const traceHeight = tracedata.height
  const svg = body
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${width ?? traceWidth}" height="${height ?? traceHeight}" viewBox="0 0 ${traceWidth} ${traceHeight}">${body}</svg>`
    : ''

  return {
    svg,
    pathCount,
    layerCount,
    traceWidth,
    traceHeight,
    background: prepared.background,
    removedPixels: prepared.removed,
    backgroundRemoved,
    backgroundSkipReason: prepared.skipReason,
  }
}
