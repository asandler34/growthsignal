'use strict';
// Passwordless sign in. Tokens and session ids are random 256 bit values; only SHA-256 hashes are stored.
const crypto = require('crypto');
const db = require('../db');
const { config } = require('../config');

const SESSION_COOKIE = 'gs_session';
const SESSION_DAYS = 30;
const TOKEN_MINUTES = 30;

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');

function normalizeEmail(e) {
  const email = String(e || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>()",;:]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(email)) return null;
  return email;
}

function safeNext(next) {
  const n = String(next || '');
  return /^\/(?!\/)[\w\-./?=&%#]*$/.test(n) ? n : '/app';
}

async function createLoginToken(email, { next, claimScanId } = {}) {
  const token = randomToken();
  await db.query(
    `INSERT INTO login_tokens (token_hash, email, next_path, claim_scan_id, expires_at) VALUES ($1, $2, $3, $4, now() + interval '${TOKEN_MINUTES} minutes')`,
    [sha256(token), email, safeNext(next), claimScanId || null]);
  return token;
}

// Consumes a token exactly once. Returns { user, nextPath, claimScanId } or null.
async function consumeLoginToken(token) {
  if (!token || token.length > 100) return null;
  return db.tx(async c => {
    const t = (await c.query(`UPDATE login_tokens SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING *`, [sha256(token)])).rows[0];
    if (!t) return null;
    const user = (await c.query(
      `INSERT INTO users (email, last_login_at) VALUES ($1, now()) ON CONFLICT (email) DO UPDATE SET last_login_at = now() RETURNING *`, [t.email])).rows[0];
    return { user, nextPath: t.next_path || '/app', claimScanId: t.claim_scan_id };
  });
}

async function createSession(userId) {
  const id = randomToken();
  await db.query(`INSERT INTO sessions (id_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [sha256(id), userId]);
  return id;
}

function cookieOptions() {
  return { httpOnly: true, secure: config.isProd || config.baseUrl.startsWith('https://'), sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 * 1000 };
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

async function userFromRequest(req) {
  const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!sid || sid.length > 100) return null;
  return db.one(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = $1 AND s.expires_at > now()`, [sha256(sid)]);
}

async function destroySession(req) {
  const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (sid) await db.query('DELETE FROM sessions WHERE id_hash = $1', [sha256(sid)]);
}

module.exports = { SESSION_COOKIE, normalizeEmail, safeNext, createLoginToken, consumeLoginToken, createSession, cookieOptions, userFromRequest, destroySession, parseCookies, sha256 };
