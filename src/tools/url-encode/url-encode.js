export function encodeLines(text, method) {
  const fn = method === 'component' ? encodeURIComponent : encodeURI
  return text.split('\n').map(fn).join('\n')
}

export function decodeLines(text, method) {
  const fn = method === 'component' ? decodeURIComponent : decodeURI
  return text.split('\n').map(fn).join('\n')
}
