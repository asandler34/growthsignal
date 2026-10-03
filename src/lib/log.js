'use strict';
// Structured JSON logs to stdout. Never log secrets, tokens, full emails or crawled content.
const { config } = require('../config');

function write(level, event, fields = {}) {
  if (config.isTest && level !== 'error' && !process.env.LOG_IN_TESTS) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

function maskEmail(e) {
  const [u, d] = String(e || '').split('@');
  return d ? `${u.slice(0, 2)}***@${d}` : '***';
}

module.exports = {
  info: (e, f) => write('info', e, f),
  warn: (e, f) => write('warn', e, f),
  error: (e, f) => write('error', e, f),
  maskEmail,
};
