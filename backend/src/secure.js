const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

/**
 * AES-256-GCM encryption for credentials stored at rest.
 * Key comes from OPSSENTINEL_SECRET_KEY (32+ chars recommended).
 * If not set, a key is derived from GITHUB_WEBHOOK_SECRET or a
 * stable local fallback so development keeps working.
 */
function getKey() {
  const raw = process.env.OPSSENTINEL_SECRET_KEY
    || process.env.GITHUB_WEBHOOK_SECRET
    || 'opsentinel-local-development-fallback-key';
  // Derive a fixed 32-byte key from the raw secret
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plaintext) {
  if (plaintext === undefined || plaintext === null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const [version, ivHex, tagHex, encHex] = String(payload).split(':');
    if (version !== 'v1') return payload; // legacy plaintext passthrough
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch (err) {
    return null;
  }
}

module.exports = { encrypt, decrypt };
