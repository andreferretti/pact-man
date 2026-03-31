const crypto = require('crypto');

const SECRET = process.env.STATE_SECRET || 'dev-secret-change-me';

/**
 * Sign a state object. Returns a hex HMAC-SHA256 signature.
 * Only signs the fields that matter for security (terms, overall_status, turn).
 */
function signState(state) {
  const payload = JSON.stringify({
    terms: state.terms,
    overall_status: state.overall_status,
    turn: state.turn || 0,
  });
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

/**
 * Verify a state object against a signature.
 * Returns true if the signature matches, false otherwise.
 */
function verifyState(state, signature) {
  if (!signature || typeof signature !== 'string') return false;
  const expected = signState(state);
  // Timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = { signState, verifyState };
