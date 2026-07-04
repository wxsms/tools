import { sha1, md5, ripemd160 } from '@noble/hashes/legacy.js'
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js'
import { hmac } from '@noble/hashes/hmac.js'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js'
import { cbc, gcm, ctr } from '@noble/ciphers/aes.js'
import { chacha20poly1305 } from '@noble/ciphers/chacha.js'

export { bytesToHex, hexToBytes, randomBytes }

export const HASH_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5', 'RIPEMD160']
export const SYMMETRIC_ALGORITHMS = ['AES-CBC', 'AES-GCM', 'AES-CTR', 'ChaCha20-Poly1305']
export const AES_KEY_SIZES = [128, 192, 256]
export const IV_LENGTHS = { 'AES-CBC': 16, 'AES-GCM': 12, 'AES-CTR': 16, 'ChaCha20-Poly1305': 12 }

const HASH_FNS = {
  'SHA-1': sha1,
  'SHA-256': sha256,
  'SHA-384': sha384,
  'SHA-512': sha512,
  'MD5': md5,
  'RIPEMD160': ripemd160,
}

const KEY_LENGTHS = {
  'AES-CBC': 32,
  'AES-GCM': 32,
  'AES-CTR': 32,
  'ChaCha20-Poly1305': 32,
}

// Ciphertext format (simple mode): salt(16) + iv(variable) + ciphertext

const SALT_LEN = 16
const PBKDF2_ITERATIONS = 100000

export function computeHash(algorithm, input) {
  const fn = HASH_FNS[algorithm]
  if (!fn) throw new Error(`Unsupported hash algorithm: ${algorithm}`)
  return bytesToHex(fn(new TextEncoder().encode(input)))
}

export function computeHmac(algorithm, key, input) {
  const fn = HASH_FNS[algorithm]
  if (!fn) throw new Error(`Unsupported hash algorithm: ${algorithm}`)
  return bytesToHex(hmac(fn, new TextEncoder().encode(key), new TextEncoder().encode(input)))
}

export function generateIv(algorithm) {
  const len = IV_LENGTHS[algorithm]
  if (!len) throw new Error(`Unknown algorithm: ${algorithm}`)
  return randomBytes(len)
}

export function generateSalt() {
  return randomBytes(SALT_LEN)
}

function getCipher(algorithm, key, iv) {
  switch (algorithm) {
    case 'AES-CBC': return cbc(key, iv)
    case 'AES-GCM': return gcm(key, iv)
    case 'AES-CTR': return ctr(key, iv)
    case 'ChaCha20-Poly1305': return chacha20poly1305(key, iv)
    default: throw new Error(`Unsupported algorithm: ${algorithm}`)
  }
}

// Simple mode: passphrase only, salt+IV auto-embedded in ciphertext
export const DEFAULT_ITERATIONS = 100000

export async function aesEncrypt(algorithm, passphrase, plaintext, iterations = DEFAULT_ITERATIONS) {
  const salt = generateSalt()
  const iv = generateIv(algorithm)
  const dkLen = KEY_LENGTHS[algorithm]
  const key = await pbkdf2Async(sha256, passphrase, salt, { c: iterations, dkLen })
  const data = new TextEncoder().encode(plaintext)
  const ciphertext = getCipher(algorithm, key, iv).encrypt(data)
  const result = new Uint8Array(salt.length + iv.length + ciphertext.length)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(ciphertext, salt.length + iv.length)
  return bytesToHex(result)
}

export async function aesDecrypt(algorithm, passphrase, ciphertextHex, iterations = DEFAULT_ITERATIONS) {
  const all = hexToBytes(ciphertextHex)
  const ivLen = IV_LENGTHS[algorithm]
  const minLen = SALT_LEN + ivLen
  if (all.length < minLen) throw new Error('Ciphertext too short')
  const salt = all.slice(0, SALT_LEN)
  const iv = all.slice(SALT_LEN, SALT_LEN + ivLen)
  const ciphertext = all.slice(SALT_LEN + ivLen)
  const dkLen = KEY_LENGTHS[algorithm]
  const key = await pbkdf2Async(sha256, passphrase, salt, { c: iterations, dkLen })
  const decrypted = getCipher(algorithm, key, iv).decrypt(ciphertext)
  return new TextDecoder().decode(decrypted)
}

// Advanced mode: raw key (Uint8Array), explicit IV, no salt/IV embedding
export function aesEncryptRaw(algorithm, key, iv, plaintext) {
  const data = new TextEncoder().encode(plaintext)
  return bytesToHex(getCipher(algorithm, key, iv).encrypt(data))
}

export function aesDecryptRaw(algorithm, key, iv, ciphertextHex) {
  const decrypted = getCipher(algorithm, key, iv).decrypt(hexToBytes(ciphertextHex))
  return new TextDecoder().decode(decrypted)
}

export async function deriveKey(passphrase, salt, keyLength, iterations = PBKDF2_ITERATIONS) {
  return pbkdf2Async(sha256, passphrase, salt, { c: iterations, dkLen: keyLength })
}
