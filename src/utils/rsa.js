const RSA_ALGO = 'RSA-OAEP'
const HASH_ALGO = 'SHA-256'

export const RSA_KEY_SIZES = [1024, 2048, 4096]

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function arrayBufferToPem(buffer, type) {
  const base64 = arrayBufferToBase64(buffer)
  const lines = base64.match(/.{1,64}/g) || []
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`
}

export function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '')
  return base64ToArrayBuffer(base64)
}

export async function generateKeyPair(modulusLength = 2048) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: RSA_ALGO,
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH_ALGO,
    },
    true,
    ['encrypt', 'decrypt'],
  )

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  return {
    publicKeyPem: arrayBufferToPem(publicKeyBuffer, 'PUBLIC KEY'),
    privateKeyPem: arrayBufferToPem(privateKeyBuffer, 'PRIVATE KEY'),
  }
}

export async function encrypt(plaintext, publicKeyPem) {
  const publicKeyBuffer = pemToArrayBuffer(publicKeyPem)
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: RSA_ALGO, hash: HASH_ALGO },
    false,
    ['encrypt'],
  )
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: RSA_ALGO },
    publicKey,
    encoded,
  )
  return arrayBufferToBase64(ciphertext)
}

export async function decrypt(ciphertextBase64, privateKeyPem) {
  const privateKeyBuffer = pemToArrayBuffer(privateKeyPem)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: RSA_ALGO, hash: HASH_ALGO },
    false,
    ['decrypt'],
  )
  const ciphertext = base64ToArrayBuffer(ciphertextBase64)
  const decrypted = await crypto.subtle.decrypt(
    { name: RSA_ALGO },
    privateKey,
    ciphertext,
  )
  return new TextDecoder().decode(decrypted)
}
