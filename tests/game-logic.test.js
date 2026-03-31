const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { scoreVCTerm, scoreFounderTerm, positionToMatch } = require('../game-logic');

// --- scoreVCTerm ---

describe('scoreVCTerm — vc_equity_percentage', () => {
  it('returns no_deal for 25% or less', () => {
    assert.equal(scoreVCTerm('vc_equity_percentage', '25'), 'no_deal');
    assert.equal(scoreVCTerm('vc_equity_percentage', '20'), 'no_deal');
    assert.equal(scoreVCTerm('vc_equity_percentage', '0'), 'no_deal');
  });

  it('scores each bracket correctly', () => {
    assert.equal(scoreVCTerm('vc_equity_percentage', '30'), 2);
    assert.equal(scoreVCTerm('vc_equity_percentage', '34'), 2);
    assert.equal(scoreVCTerm('vc_equity_percentage', '35'), 3);
    assert.equal(scoreVCTerm('vc_equity_percentage', '39'), 3);
    assert.equal(scoreVCTerm('vc_equity_percentage', '40'), 6);
    assert.equal(scoreVCTerm('vc_equity_percentage', '45'), 6);
    assert.equal(scoreVCTerm('vc_equity_percentage', '46'), 9);
    assert.equal(scoreVCTerm('vc_equity_percentage', '49'), 9);
    assert.equal(scoreVCTerm('vc_equity_percentage', '50'), 11);
    assert.equal(scoreVCTerm('vc_equity_percentage', '55'), 15);
    assert.equal(scoreVCTerm('vc_equity_percentage', '60'), 18);
    assert.equal(scoreVCTerm('vc_equity_percentage', '70'), 20);
  });

  it('returns null for non-numeric values', () => {
    assert.equal(scoreVCTerm('vc_equity_percentage', 'abc'), null);
  });
});

describe('scoreVCTerm — type_of_stock', () => {
  it('scores each stock type', () => {
    assert.equal(scoreVCTerm('type_of_stock', 'Common'), 0);
    assert.equal(scoreVCTerm('type_of_stock', 'Convertible Preferred'), 8);
    assert.equal(scoreVCTerm('type_of_stock', 'Redeemable Preferred'), 12);
  });

  it('is case-insensitive', () => {
    assert.equal(scoreVCTerm('type_of_stock', 'COMMON'), 0);
    assert.equal(scoreVCTerm('type_of_stock', 'convertible preferred'), 8);
  });
});

describe('scoreVCTerm — vc_board_members', () => {
  it('scores each count', () => {
    assert.equal(scoreVCTerm('vc_board_members', '0'), 0);
    assert.equal(scoreVCTerm('vc_board_members', '1'), 3);
    assert.equal(scoreVCTerm('vc_board_members', '2'), 5);
    assert.equal(scoreVCTerm('vc_board_members', '3'), 7);
    assert.equal(scoreVCTerm('vc_board_members', '4'), 10);
    assert.equal(scoreVCTerm('vc_board_members', '5'), 10);
  });
});

describe('scoreVCTerm — founder_vesting', () => {
  it('returns no_deal for none or under 4 years', () => {
    assert.equal(scoreVCTerm('founder_vesting', 'none'), 'no_deal');
    assert.equal(scoreVCTerm('founder_vesting', 'no vesting'), 'no_deal');
    assert.equal(scoreVCTerm('founder_vesting', '0'), 'no_deal');
    assert.equal(scoreVCTerm('founder_vesting', '3'), 'no_deal');
    assert.equal(scoreVCTerm('founder_vesting', 'less than 4 years'), 'no_deal');
  });

  it('scores 4, 5, and 6+ years', () => {
    assert.equal(scoreVCTerm('founder_vesting', '4'), 8);
    assert.equal(scoreVCTerm('founder_vesting', '5'), 12);
    assert.equal(scoreVCTerm('founder_vesting', '6'), 14);
    assert.equal(scoreVCTerm('founder_vesting', 'more than 5 years'), 14);
  });
});

describe('scoreVCTerm — ceo_replacement', () => {
  it('returns no_deal for no provision', () => {
    assert.equal(scoreVCTerm('ceo_replacement', 'No provision'), 'no_deal');
    assert.equal(scoreVCTerm('ceo_replacement', 'none'), 'no_deal');
  });

  it('scores each provision level', () => {
    assert.equal(scoreVCTerm('ceo_replacement', 'Conservative Projections'), 6);
    assert.equal(scoreVCTerm('ceo_replacement', 'Moderate Projections'), 10);
    assert.equal(scoreVCTerm('ceo_replacement', 'Aggressive Projections'), 16);
  });
});

describe('scoreVCTerm — edge cases', () => {
  it('returns null for null/empty value', () => {
    assert.equal(scoreVCTerm('vc_equity_percentage', null), null);
    assert.equal(scoreVCTerm('vc_equity_percentage', ''), null);
  });

  it('returns null for unknown term', () => {
    assert.equal(scoreVCTerm('unknown_term', '50'), null);
  });
});

// --- scoreFounderTerm ---

describe('scoreFounderTerm — vc_equity_percentage', () => {
  it('returns no_deal for 60% or more', () => {
    assert.equal(scoreFounderTerm('vc_equity_percentage', '60'), 'no_deal');
    assert.equal(scoreFounderTerm('vc_equity_percentage', '75'), 'no_deal');
  });

  it('scores each bracket correctly', () => {
    assert.equal(scoreFounderTerm('vc_equity_percentage', '56'), 4);
    assert.equal(scoreFounderTerm('vc_equity_percentage', '50'), 8);
    assert.equal(scoreFounderTerm('vc_equity_percentage', '47'), 16);
    assert.equal(scoreFounderTerm('vc_equity_percentage', '42'), 18);
    assert.equal(scoreFounderTerm('vc_equity_percentage', '36'), 20);
    assert.equal(scoreFounderTerm('vc_equity_percentage', '31'), 22);
    assert.equal(scoreFounderTerm('vc_equity_percentage', '30'), 24);
  });
});

describe('scoreFounderTerm — vc_board_members', () => {
  it('returns no_deal for more than 2', () => {
    assert.equal(scoreFounderTerm('vc_board_members', '3'), 'no_deal');
    assert.equal(scoreFounderTerm('vc_board_members', '4'), 'no_deal');
  });

  it('scores 0, 1, 2', () => {
    assert.equal(scoreFounderTerm('vc_board_members', '0'), 2);
    assert.equal(scoreFounderTerm('vc_board_members', '1'), 8);
    assert.equal(scoreFounderTerm('vc_board_members', '2'), 6);
  });
});

describe('scoreFounderTerm — ceo_replacement', () => {
  it('returns no_deal for aggressive', () => {
    assert.equal(scoreFounderTerm('ceo_replacement', 'Aggressive Projections'), 'no_deal');
  });

  it('scores other provision levels', () => {
    assert.equal(scoreFounderTerm('ceo_replacement', 'Moderate Projections'), 7);
    assert.equal(scoreFounderTerm('ceo_replacement', 'Conservative Projections'), 14);
    assert.equal(scoreFounderTerm('ceo_replacement', 'No provision'), 19);
  });
});

// --- positionToMatch ---

describe('positionToMatch', () => {
  it('maps equity to correct bracket', () => {
    assert.equal(positionToMatch('vc_equity_percentage', '25'), '30_or_less');
    assert.equal(positionToMatch('vc_equity_percentage', '33'), '31_35');
    assert.equal(positionToMatch('vc_equity_percentage', '40'), '36_41');
    assert.equal(positionToMatch('vc_equity_percentage', '45'), '42_46');
    assert.equal(positionToMatch('vc_equity_percentage', '48'), '47_49');
    assert.equal(positionToMatch('vc_equity_percentage', '50'), '50_55');
    assert.equal(positionToMatch('vc_equity_percentage', '57'), '56_59');
    assert.equal(positionToMatch('vc_equity_percentage', '65'), '60_plus');
  });

  it('maps stock types', () => {
    assert.equal(positionToMatch('type_of_stock', 'Common'), 'common');
    assert.equal(positionToMatch('type_of_stock', 'Convertible Preferred'), 'convertible');
    assert.equal(positionToMatch('type_of_stock', 'Redeemable Preferred'), 'redeemable');
  });

  it('maps board members', () => {
    assert.equal(positionToMatch('vc_board_members', '0'), '0');
    assert.equal(positionToMatch('vc_board_members', '1'), '1');
    assert.equal(positionToMatch('vc_board_members', '2'), '2');
    assert.equal(positionToMatch('vc_board_members', '3'), 'more_than_2');
  });

  it('maps vesting periods', () => {
    assert.equal(positionToMatch('founder_vesting', 'none'), 'none');
    assert.equal(positionToMatch('founder_vesting', '3'), '3_or_less');
    assert.equal(positionToMatch('founder_vesting', '4'), '4_5');
    assert.equal(positionToMatch('founder_vesting', '5'), '4_5');
    assert.equal(positionToMatch('founder_vesting', '6'), '6_plus');
    assert.equal(positionToMatch('founder_vesting', 'more than 5 years'), '6_plus');
  });

  it('maps CEO replacement provisions', () => {
    assert.equal(positionToMatch('ceo_replacement', 'No provision'), 'none');
    assert.equal(positionToMatch('ceo_replacement', 'Conservative Projections'), 'conservative');
    assert.equal(positionToMatch('ceo_replacement', 'Moderate Projections'), 'moderate');
    assert.equal(positionToMatch('ceo_replacement', 'Aggressive Projections'), 'aggressive');
  });

  it('returns null for unknown values', () => {
    assert.equal(positionToMatch('vc_equity_percentage', null), null);
    assert.equal(positionToMatch('unknown_term', '50'), null);
  });
});
