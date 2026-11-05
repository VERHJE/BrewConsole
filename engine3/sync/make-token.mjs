// Maakt een toegangstoken voor één toestel.
//   node engine3/sync/make-token.mjs
// Het token zet je in de app op dat toestel. De hash zet je als geheim op de Worker
// (TOKEN_HASHES, meerdere toestellen gescheiden door komma's). Het token zelf staat nergens op de server.
import { createHash, randomBytes } from 'node:crypto';
const token = randomBytes(32).toString('base64url');
console.log('Token (bewaar op het toestel):', token);
console.log('Hash (voor TOKEN_HASHES op de Worker):', createHash('sha256').update(token).digest('hex'));
