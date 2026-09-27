import { randomBytes } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { hashPassword } from '../server/auth.js';
await mkdir('private', { recursive: true });
const users = ['Peter', 'Rebecka'].map(name => ({ id: name.toLowerCase(), name, password: randomBytes(18).toString('base64url') }));
const env = { APP_USERS: JSON.stringify(users.map(({ password, ...u }) => ({ ...u, passwordHash: hashPassword(password) }))), IMPORT_TOKEN: randomBytes(32).toString('base64url'), NODE_ENV: 'production' };
await writeFile('private/deploy-env.json', JSON.stringify(env), { mode: 0o600, flag: 'wx' });
await writeFile('private/access.json', JSON.stringify(users, null, 2), { mode: 0o600, flag: 'wx' });
console.log('Created private deployment settings and access details. No credentials printed.');
