import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

export function hashPassword(password: string) {
  if (password.length < 10) {
    throw new Error("La contraseña debe tener al menos 10 caracteres.");
  }

  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024
  });

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derived.toString("base64url")
  ].join("$");
}

export function verifyPassword(password: string, storedHash: string) {
  try {
    const [algorithm, costText, blockSizeText, parallelizationText, saltText, hashText] =
      storedHash.split("$");

    if (algorithm !== "scrypt" || !saltText || !hashText) return false;

    const cost = Number(costText);
    const blockSize = Number(blockSizeText);
    const parallelization = Number(parallelizationText);

    if (![cost, blockSize, parallelization].every(Number.isFinite)) return false;

    const expected = Buffer.from(hashText, "base64url");
    const actual = scryptSync(password, Buffer.from(saltText, "base64url"), expected.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: 64 * 1024 * 1024
    });

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
