import { md5 } from '@noble/hashes/legacy.js'
import { bytesToHex } from '@noble/hashes/utils.js'

export function computeMd5(text) {
  return bytesToHex(md5(new TextEncoder().encode(text)))
}
