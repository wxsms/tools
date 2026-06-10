import { sha1, md5, ripemd160 } from '@noble/hashes/legacy.js'
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js'
import { hmac } from '@noble/hashes/hmac.js'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js'
import { cbc, gcm } from '@noble/ciphers/aes.js'

export { bytesToHex, hexToBytes, randomBytes }

export const HASH_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5', 'RIPEMD160']
export const AES_ALGORITHMS = ['AES-CBC', 'AES-GCM']
export const AES_KEY_SIZES = [128, 192, 256]

const HASH_FNS = {
  'SHA-1': sha1,
  'SHA-256': sha256,
  'SHA-384': sha384,
  'SHA-512': sha512,
  'MD5': md5,
  'RIPEMD160': ripemd160,
}

// Ciphertext format (simple mode): salt(16) + iv(variable) + ciphertext
// - AES-CBC: salt(16) + iv(16) + ciphertext
// - AES-GCM: salt(16) + nonce(12) + ciphertext

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
  const len = algorithm === 'AES-GCM' ? 12 : 16
  return randomBytes(len)
}

export function generateSalt() {
  return randomBytes(SALT_LEN)
}

// Simple mode: passphrase only, salt+IV auto-embedded in ciphertext
export const DEFAULT_ITERATIONS = 100000

export async function aesEncrypt(algorithm, passphrase, plaintext, iterations = DEFAULT_ITERATIONS) {
  const salt = generateSalt()
  const iv = generateIv(algorithm)
  const key = await pbkdf2Async(sha256, passphrase, salt, { c: iterations, dkLen: 32 })
  const data = new TextEncoder().encode(plaintext)
  const cipher = algorithm === 'AES-GCM' ? gcm(key, iv) : cbc(key, iv)
  const ciphertext = cipher.encrypt(data)
  const result = new Uint8Array(salt.length + iv.length + ciphertext.length)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(ciphertext, salt.length + iv.length)
  return bytesToHex(result)
}

export async function aesDecrypt(algorithm, passphrase, ciphertextHex, iterations = DEFAULT_ITERATIONS) {
  const all = hexToBytes(ciphertextHex)
  const ivLen = algorithm === 'AES-GCM' ? 12 : 16
  const minLen = SALT_LEN + ivLen
  if (all.length < minLen) throw new Error('Ciphertext too short')
  const salt = all.slice(0, SALT_LEN)
  const iv = all.slice(SALT_LEN, SALT_LEN + ivLen)
  const ciphertext = all.slice(SALT_LEN + ivLen)
  const key = await pbkdf2Async(sha256, passphrase, salt, { c: iterations, dkLen: 32 })
  const cipher = algorithm === 'AES-GCM' ? gcm(key, iv) : cbc(key, iv)
  const decrypted = cipher.decrypt(ciphertext)
  return new TextDecoder().decode(decrypted)
}

// Advanced mode: raw key (Uint8Array), explicit IV, no salt/IV embedding
export function aesEncryptRaw(algorithm, key, iv, plaintext) {
  const data = new TextEncoder().encode(plaintext)
  const cipher = algorithm === 'AES-GCM' ? gcm(key, iv) : cbc(key, iv)
  return bytesToHex(cipher.encrypt(data))
}

export function aesDecryptRaw(algorithm, key, iv, ciphertextHex) {
  const cipher = algorithm === 'AES-GCM' ? gcm(key, iv) : cbc(key, iv)
  const decrypted = cipher.decrypt(hexToBytes(ciphertextHex))
  return new TextDecoder().decode(decrypted)
}

export async function deriveKey(passphrase, salt, keyLength, iterations = PBKDF2_ITERATIONS) {
  return pbkdf2Async(sha256, passphrase, salt, { c: iterations, dkLen: keyLength })
}
