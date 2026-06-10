export function encodeBase64(text) {
  return btoa(unescape(encodeURIComponent(text)))
}

export function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64.trim())))
}
