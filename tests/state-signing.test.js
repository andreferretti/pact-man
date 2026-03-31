const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { signState, verifyState } = require('../api/_state-signing');

function makeState(overrides = {}) {
  return {
    terms: {
      vc_equity_percentage: { status: 'open', vc_position: null, founder_position: null, agreed_value: null },
      type_of_stock: { status: 'open', vc_position: null, founder_position: null, agreed_value: null },
      vc_board_members: { status: 'open', vc_position: null, founder_position: null, agreed_value: null },
      founder_vesting: { status: 'open', vc_position: null, founder_position: null, agreed_value: null },
      ceo_replacement: { status: 'open', vc_position: null, founder_position: null, agreed_value: null },
    },
    overall_status: 'negotiating',
    turn: 0,
    ...overrides,
  };
}

describe('signState', () => {
  it('returns a 64-char hex string', () => {
    const sig = signState(makeState());
    assert.match(sig, /^[0-9a-f]{64}$/);
  });

  it('returns the same signature for the same state', () => {
    const state = makeState();
    assert.equal(signState(state), signState(state));
  });

  it('returns different signatures for different states', () => {
    const sig1 = signState(makeState());
    const sig2 = signState(makeState({ turn: 1 }));
    assert.notEqual(sig1, sig2);
  });

  it('ignores extra fields not in the signed payload', () => {
    const state = makeState();
    const sig1 = signState(state);
    const sig2 = signState({ ...state, _judgeRaw: { foo: 'bar' }, _judgeError: 'oops' });
    assert.equal(sig1, sig2);
  });
});

describe('verifyState', () => {
  it('returns true for a valid signature', () => {
    const state = makeState();
    const sig = signState(state);
    assert.equal(verifyState(state, sig), true);
  });

  it('returns false for a tampered state', () => {
    const state = makeState();
    const sig = signState(state);

    // Tamper with a term
    const tampered = JSON.parse(JSON.stringify(state));
    tampered.terms.vc_equity_percentage.status = 'tentatively_agreed';
    tampered.terms.vc_equity_percentage.agreed_value = '70';

    assert.equal(verifyState(tampered, sig), false);
  });

  it('returns false for a tampered turn counter (replay attack)', () => {
    const state = makeState({ turn: 3 });
    const sig = signState(state);

    const replayed = { ...state, turn: 1 };
    assert.equal(verifyState(replayed, sig), false);
  });

  it('returns false for null/missing signature', () => {
    const state = makeState();
    assert.equal(verifyState(state, null), false);
    assert.equal(verifyState(state, undefined), false);
    assert.equal(verifyState(state, ''), false);
  });

  it('returns false for a garbage signature', () => {
    const state = makeState();
    assert.equal(verifyState(state, 'not-a-real-signature-at-all-nope'), false);
  });
});
