const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateScores, defaultState, buildPrompt, STRATEGIES } = require('../api/negotiate');

describe('defaultState', () => {
  it('returns 5 terms all open', () => {
    const state = defaultState();
    const termKeys = Object.keys(state.terms);
    assert.equal(termKeys.length, 5);
    for (const key of termKeys) {
      assert.equal(state.terms[key].status, 'open');
      assert.equal(state.terms[key].agreed_value, null);
    }
  });

  it('starts as negotiating', () => {
    assert.equal(defaultState().overall_status, 'negotiating');
  });

  it('returns a fresh object each call', () => {
    const a = defaultState();
    const b = defaultState();
    assert.notEqual(a, b);
    assert.notEqual(a.terms, b.terms);
  });
});

describe('calculateScores', () => {
  it('returns 0 for a fresh state', () => {
    const { vcScore, vcNoDeal, agreedCount } = calculateScores(defaultState());
    assert.equal(vcScore, 0);
    assert.equal(vcNoDeal, false);
    assert.equal(agreedCount, 0);
  });

  it('sums agreed terms correctly', () => {
    const state = defaultState();
    state.terms.vc_equity_percentage = { status: 'tentatively_agreed', agreed_value: '45' };
    state.terms.type_of_stock = { status: 'tentatively_agreed', agreed_value: 'Convertible Preferred' };

    const { vcScore, vcNoDeal, agreedCount } = calculateScores(state);
    assert.equal(vcScore, 6 + 8); // 45% = 6pts, convertible = 8pts
    assert.equal(agreedCount, 2);
    assert.equal(vcNoDeal, false);
  });

  it('detects no_deal terms', () => {
    const state = defaultState();
    state.terms.vc_equity_percentage = { status: 'tentatively_agreed', agreed_value: '20' };

    const { vcNoDeal } = calculateScores(state);
    assert.equal(vcNoDeal, true);
  });

  it('ignores non-agreed terms', () => {
    const state = defaultState();
    state.terms.vc_equity_percentage = { status: 'discussed', agreed_value: null, vc_position: '50%' };

    const { vcScore, agreedCount } = calculateScores(state);
    assert.equal(vcScore, 0);
    assert.equal(agreedCount, 0);
  });
});

describe('buildPrompt', () => {
  it('includes strategy-specific content', () => {
    const prompt = buildPrompt(defaultState(), 'aggressive');
    assert.ok(prompt.includes('AGGRESSIVE'));
    assert.ok(!prompt.includes('COLLABORATIVE'));
  });

  it('falls back to collaborative for unknown strategy', () => {
    const prompt = buildPrompt(defaultState(), 'nonexistent');
    assert.ok(prompt.includes('COLLABORATIVE'));
  });

  it('includes negotiation state context', () => {
    const state = defaultState();
    state.terms.vc_equity_percentage = { status: 'tentatively_agreed', agreed_value: '40' };

    const prompt = buildPrompt(state, 'collaborative');
    assert.ok(prompt.includes('TENTATIVELY AGREED at 40'));
  });
});

describe('STRATEGIES', () => {
  it('has all three strategies with required fields', () => {
    for (const key of ['aggressive', 'collaborative', 'charming']) {
      assert.ok(STRATEGIES[key], `missing strategy: ${key}`);
      assert.ok(STRATEGIES[key].name, `missing name for ${key}`);
      assert.ok(STRATEGIES[key].prompt, `missing prompt for ${key}`);
      assert.ok(STRATEGIES[key].intro, `missing intro for ${key}`);
    }
  });
});
