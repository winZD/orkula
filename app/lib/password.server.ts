import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

const SALT_LENGTH = 32
const KEY_LENGTH = 64
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)

  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })

  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, "hex")
  const storedHash = Buffer.from(hashHex, "hex")

  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })

  return timingSafeEqual(hash, storedHash)
}
