// ============================================================
// Export Encryption / Decryption - AES-256-GCM via Web Crypto
// ============================================================

const PBKDF2_ITERATIONS = 600_000;

interface EncryptedPayload {
  browseverse_encrypted: true;
  enc_version: string;
  algorithm: string;
  kdf: string;
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

// ---- helpers ------------------------------------------------

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ---- public API ---------------------------------------------

/** Check whether a string looks like an encrypted BrowseVerse export */
export function isEncryptedExport(content: string): boolean {
  try {
    const obj = JSON.parse(content);
    return obj?.browseverse_encrypted === true;
  } catch {
    return false;
  }
}

/**
 * Encrypt an export JSON string with a password.
 * Returns a JSON string containing the encrypted wrapper.
 */
export async function encryptExport(
  plaintext: string,
  password: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );

  const payload: EncryptedPayload = {
    browseverse_encrypted: true,
    enc_version: '1.0',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(cipherBuf),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Decrypt an encrypted export.
 * Throws if the password is wrong or the data is corrupted.
 */
export async function decryptExport(
  encryptedJson: string,
  password: string,
): Promise<string> {
  const payload: EncryptedPayload = JSON.parse(encryptedJson);

  if (!payload.browseverse_encrypted) {
    throw new Error('Not an encrypted BrowseVerse export.');
  }

  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const iterations = payload.iterations || PBKDF2_ITERATIONS;

  const key = await deriveKey(password, salt, iterations);

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    throw new Error('Incorrect password or corrupted file.');
  }
}
