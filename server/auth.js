import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { scrypt } from 'node:crypto';
const scryptAsync = promisify(scrypt);
export const token = () => randomBytes(32).toString('base64url');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export async function passwordMatches(password, encoded) {
  const [salt, expected] = (encoded || '').split(':');
  if (!salt || !/^[0-9a-f]{128}$/.test(expected || '')) return false;
  return timingSafeEqual(await scryptAsync(password, salt, 64), Buffer.from(expected, 'hex'));
}
export function sameSecret(a, b) {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
