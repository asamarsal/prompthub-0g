export interface PromptEncryptionContext {
  scheme: "AES-256-GCM"
  keyId: string
  keyB64: string
}

export interface EncryptedFileResult {
  file: File
  ivB64: string
  plaintextSha256: string
  ciphertextSha256: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function createPromptEncryptionContext(): Promise<PromptEncryptionContext> {
  const key = crypto.getRandomValues(new Uint8Array(32))
  return {
    scheme: "AES-256-GCM",
    keyId: crypto.randomUUID(),
    keyB64: bytesToBase64(key),
  }
}

export async function encryptFileFor0G(file: File, context: PromptEncryptionContext): Promise<EncryptedFileResult> {
  const rawKey = Uint8Array.from(atob(context.keyB64), (char) => char.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new Uint8Array(await file.arrayBuffer())
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext))
  const encryptedName = file.name.endsWith(".enc") ? file.name : `${file.name}.enc`

  return {
    file: new File([ciphertext], encryptedName, { type: "application/octet-stream" }),
    ivB64: bytesToBase64(iv),
    plaintextSha256: await sha256Hex(plaintext),
    ciphertextSha256: await sha256Hex(ciphertext),
  }
}
