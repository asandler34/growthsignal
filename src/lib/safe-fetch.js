'use strict';
// SSRF-resistant HTTP fetcher for crawling customer-supplied URLs.
// Guarantees:
//  - only http/https on ports 80/443, no embedded credentials
//  - every DNS answer is checked at connect time (blocks private, loopback, link local,
//    metadata, CGNAT, multicast and other non-public ranges, and DNS rebinding)
//  - redirects are followed manually, at most config.scanner.maxRedirects hops, each re-validated
//  - response bodies (after decompression) are capped at maxBytes; extra data is discarded
//  - a hard overall timeout per request
const http = require('http');
const https = require('https');
const dns = require('dns');
const zlib = require('zlib');
const net = require('net');
const ipaddr = require('ipaddr.js');
const { config } = require('../config');

class FetchBlockedError extends Error {
  constructor(message, code = 'blocked') { super(message); this.code = code; }
}

function isPublicAddress(address) {
  let addr;
  try { addr = ipaddr.parse(address); } catch { return false; }
  if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) addr = addr.toIPv4Address();
  return addr.range() === 'unicast';
}

// Test only relaxations: true allows any address; 'loopback' allows only 127.0.0.0/8 and ::1, so
// redirect chains from a local fixture to other private ranges are still blocked.
function allowPrivate(opts) {
  return opts.allowPrivateNetworks ?? config.scanner.allowPrivateNetworks;
}
function permitted(address, opts) {
  const mode = allowPrivate(opts);
  if (mode === true) return true;
  if (isPublicAddress(address)) return true;
  if (mode === 'loopback') {
    try { let a = ipaddr.parse(address); if (a.kind() === 'ipv6' && a.isIPv4MappedAddress()) a = a.toIPv4Address(); return a.range() === 'loopback'; } catch { return false; }
  }
  return false;
}

// Validates the URL shape. Returns a URL object or throws FetchBlockedError.
function validateUrl(raw, opts = {}) {
  let u;
  try { u = new URL(raw); } catch { throw new FetchBlockedError('Not a valid URL', 'invalid_url'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new FetchBlockedError('Only http and https URLs are supported', 'invalid_scheme');
  if (u.username || u.password) throw new FetchBlockedError('URLs with credentials are not allowed', 'credentials');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const mode = allowPrivate(opts);
  if (mode !== true) {
    if (net.isIP(host)) {
      if (!permitted(host, opts)) throw new FetchBlockedError('That address is not a public website', 'private_address');
    }
  }
  if (!mode) {
    if (u.port && !['80', '443'].includes(u.port)) throw new FetchBlockedError('Only standard web ports are scanned', 'port');
    if (!net.isIP(host)) {
      if (!host.includes('.') || host === 'localhost' || /\.(localhost|local|internal|lan|home|corp|intranet)$/.test(host)) {
        throw new FetchBlockedError('That host is not a public website', 'private_host');
      }
    }
  }
  return u;
}

// dns lookup hook used by the socket itself, so the address we validate is the address we connect to.
function makeLookup(opts) {
  return (hostname, options, callback) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) return callback(err);
      if (!addresses || !addresses.length) return callback(new FetchBlockedError('Host did not resolve', 'dns'));
      {
        const bad = addresses.find(a => !permitted(a.address, opts));
        if (bad) return callback(new FetchBlockedError('Host resolves to a non-public address', 'private_address'));
      }
      const chosen = addresses[0];
      if (options && options.all) return callback(null, [chosen]);
      callback(null, chosen.address, chosen.family);
    });
  };
}

function requestOnce(u, opts) {
  const maxBytes = opts.maxBytes ?? config.scanner.maxBytes;
  const timeoutMs = opts.timeoutMs ?? config.scanner.timeoutMs;
  const lib = u.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, v) => { if (!settled) { settled = true; clearTimeout(timer); fn(v); } };
    const req = lib.request(u, {
      method: opts.method || 'GET',
      lookup: makeLookup(opts),
      agent: false,
      headers: {
        'user-agent': opts.userAgent || config.scanner.userAgent,
        accept: opts.accept || 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.8',
      },
    }, res => {
      const enc = String(res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip' || enc === 'x-gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      const chunks = [];
      let size = 0;
      let truncated = false;
      stream.on('data', c => {
        if (truncated) return;
        if (size + c.length > maxBytes) {
          chunks.push(c.subarray(0, maxBytes - size));
          size = maxBytes;
          truncated = true;
          res.destroy();
          finish();
          return;
        }
        chunks.push(c);
        size += c.length;
      });
      const finish = () => done(resolve, {
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
        truncated,
        remoteAddress: res.socket && res.socket.remoteAddress,
      });
      stream.on('end', finish);
      stream.on('error', e => (truncated ? finish() : done(reject, e)));
      res.on('aborted', () => (truncated ? finish() : done(reject, new Error('Connection aborted'))));
    });
    const timer = setTimeout(() => { req.destroy(new FetchBlockedError(`Timed out after ${timeoutMs} ms`, 'timeout')); }, timeoutMs);
    req.on('error', e => done(reject, e));
    req.end();
  });
}

/**
 * Fetch a URL safely. Returns { url, finalUrl, status, headers, text, truncated, redirects, ms, contentType }.
 * Throws FetchBlockedError for policy violations, or network errors.
 */
async function safeFetch(raw, opts = {}) {
  const started = Date.now();
  const redirects = [];
  let u = validateUrl(raw, opts);
  const maxRedirects = opts.maxRedirects ?? config.scanner.maxRedirects;
  for (let hop = 0; ; hop++) {
    const res = await requestOnce(u, opts);
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      if (hop >= maxRedirects) throw new FetchBlockedError(`Too many redirects (more than ${maxRedirects})`, 'redirects');
      let next;
      try { next = new URL(res.headers.location, u); } catch { throw new FetchBlockedError('Invalid redirect location', 'redirect_invalid'); }
      redirects.push({ from: u.href, to: next.href, status: res.status });
      u = validateUrl(next.href, opts);
      continue;
    }
    const contentType = String(res.headers['content-type'] || '');
    const charset = (/charset=([\w-]+)/i.exec(contentType) || [])[1];
    let text;
    try { text = new TextDecoder(charset || 'utf-8').decode(res.body); } catch { text = res.body.toString('utf8'); }
    return {
      url: raw,
      finalUrl: u.href,
      status: res.status,
      headers: res.headers,
      text,
      bytes: res.body.length,
      truncated: res.truncated,
      redirects,
      ms: Date.now() - started,
      contentType,
    };
  }
}

module.exports = { safeFetch, validateUrl, isPublicAddress, FetchBlockedError };
