// Founder bot configuration — tweak these to change the bot's goals and limits.
// The bot plays the FOUNDER seeking investment. The human plays the VC.
const BOT_CONFIG = {
  valuation:      { ideal: 50,  limit: 15,  weight: 0.30 }, // founder wants higher valuation ($M)
  equity:         { ideal: 10,  limit: 35,  weight: 0.35 }, // founder wants to give away less equity (%)
  boardSeats:     { ideal: 1,   limit: 3,   weight: 0.15 }, // founder wants fewer VC board seats
  liquidationPref:{ ideal: 1.0, limit: 2.5, weight: 0.20 }, // founder wants lower liquidation preference (x)
};

const MAX_ROUNDS = 6;
const ACCEPT_THRESHOLD = 0.72; // utility >= this → accept
const REJECT_THRESHOLD = 0.28; // utility < this → walk away

function clamp(val) {
  return Math.max(0, Math.min(1, val));
}

// Score an incoming VC offer from the founder's perspective.
// Each term is normalized to [0,1] where 1 = founder's ideal, 0 = founder's limit.
function scoreOffer(offer) {
  const c = BOT_CONFIG;
  const scores = {
    // Valuation: higher is better for founder
    valuation:       clamp((offer.valuation - c.valuation.limit) / (c.valuation.ideal - c.valuation.limit)),
    // Equity: lower is better for founder
    equity:          clamp((c.equity.limit - offer.equity) / (c.equity.limit - c.equity.ideal)),
    // Board seats: fewer is better for founder
    boardSeats:      clamp((c.boardSeats.limit - offer.boardSeats) / (c.boardSeats.limit - c.boardSeats.ideal)),
    // Liquidation preference: lower is better for founder
    liquidationPref: clamp((c.liquidationPref.limit - offer.liquidationPref) / (c.liquidationPref.limit - c.liquidationPref.ideal)),
  };
  const utility =
    scores.valuation       * c.valuation.weight +
    scores.equity          * c.equity.weight +
    scores.boardSeats      * c.boardSeats.weight +
    scores.liquidationPref * c.liquidationPref.weight;
  return { utility, scores };
}

// Generate a counteroffer. The bot starts near its ideal and concedes
// toward the VC's offer as rounds increase.
function generateCounter(offer, round) {
  const c = BOT_CONFIG;
  const factor = Math.min(0.78, round * 0.13);
  return {
    valuation:       Math.round(Math.max(c.valuation.limit,       c.valuation.ideal       + (offer.valuation       - c.valuation.ideal)       * factor)),
    equity:          Math.round(Math.min(c.equity.limit,           c.equity.ideal          + (offer.equity          - c.equity.ideal)          * factor)),
    boardSeats:      Math.round(Math.min(c.boardSeats.limit,       c.boardSeats.ideal      + (offer.boardSeats      - c.boardSeats.ideal)      * factor)),
    liquidationPref: +(Math.min(c.liquidationPref.limit, c.liquidationPref.ideal + (offer.liquidationPref - c.liquidationPref.ideal) * factor)).toFixed(1),
  };
}

const COUNTER_INTROS = [
  "Appreciate the term sheet. I think the vision here is worth more — let me show you where I'm coming from.",
  "Thanks for coming back to the table. I can move on some things, but I need to protect the cap table.",
  "We're getting closer. I'm flexible on structure, but the valuation needs to reflect our traction.",
  "I like the direction. Let me push back gently on a couple of points.",
  "We're almost there. Here's what I can realistically commit to and still keep my team motivated.",
  "Last round — let's make this work. Here's my final position.",
];

function buildMessage(status, offer, counter, round) {
  if (status === 'accepted') {
    return `We have a deal! I'm happy to accept: $${offer.valuation}M valuation, ${offer.equity}% equity, ${offer.boardSeats} board seat${offer.boardSeats !== 1 ? 's' : ''}, ${offer.liquidationPref}x liquidation preference. Let's build something great together.`;
  }
  if (status === 'rejected') {
    if (round > MAX_ROUNDS) {
      return `We've gone back and forth but can't find alignment. I'll need to explore other investors. Thanks for your time.`;
    }
    return `These terms don't work for us — the dilution is too aggressive and the structure is too punitive. I'll have to pass on this round.`;
  }
  return COUNTER_INTROS[Math.min(round - 1, COUNTER_INTROS.length - 1)];
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { offer, round = 1 } = req.body || {};

  if (!offer || typeof offer !== 'object') {
    return res.status(400).json({ error: 'Missing offer' });
  }

  const { valuation, equity, boardSeats, liquidationPref } = offer;
  if ([valuation, equity, boardSeats, liquidationPref].some(v => typeof v !== 'number' || v <= 0)) {
    return res.status(400).json({ error: 'Invalid offer values — all must be positive numbers' });
  }

  const { utility } = scoreOffer(offer);

  let status, counter;
  if (utility >= ACCEPT_THRESHOLD) {
    status = 'accepted';
    counter = null;
  } else if (utility < REJECT_THRESHOLD || round > MAX_ROUNDS) {
    status = 'rejected';
    counter = null;
  } else {
    status = 'countered';
    counter = generateCounter(offer, round);
  }

  res.status(200).json({
    status,
    counter,
    message: buildMessage(status, offer, counter, round),
    utility: Math.round(utility * 100),
  });
};
