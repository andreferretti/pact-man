// Founder bot configuration — tweak these to change the bot's goals and limits.
// The bot plays the FOUNDER seeking investment. The human plays the VC.
const BOT_CONFIG = {
  valuation:      { ideal: 50,  limit: 15,  weight: 0.30 }, // founder wants higher valuation ($M)
  investment:     { ideal: 5,   limit: 20,  weight: 0.35 }, // founder wants less investment to minimize dilution ($M)
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
    // Investment: lower is better for founder (less dilution)
    investment:      clamp((c.investment.limit - offer.investment) / (c.investment.limit - c.investment.ideal)),
    // Board seats: fewer is better for founder
    boardSeats:      clamp((c.boardSeats.limit - offer.boardSeats) / (c.boardSeats.limit - c.boardSeats.ideal)),
    // Liquidation preference: lower is better for founder
    liquidationPref: clamp((c.liquidationPref.limit - offer.liquidationPref) / (c.liquidationPref.limit - c.liquidationPref.ideal)),
  };
  const utility =
    scores.valuation       * c.valuation.weight +
    scores.investment      * c.investment.weight +
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
    investment:      Math.round(Math.min(c.investment.limit,       c.investment.ideal      + (offer.investment      - c.investment.ideal)      * factor)),
    boardSeats:      Math.round(Math.min(c.boardSeats.limit,       c.boardSeats.ideal      + (offer.boardSeats      - c.boardSeats.ideal)      * factor)),
    liquidationPref: +(Math.min(c.liquidationPref.limit, c.liquidationPref.ideal + (offer.liquidationPref - c.liquidationPref.ideal) * factor)).toFixed(1),
  };
}

const COUNTER_INTROS = [
  "Appreciate the term sheet. We're building orbital infrastructure here — the upside is literally astronomical. Let me show you where I'm coming from.",
  "Thanks for coming back to the table. I can move on some things, but I need to protect the cap table — our launch window is tight and the team needs skin in the game.",
  "We're getting closer to alignment. I'm flexible on structure, but the valuation needs to reflect our payload contracts and launch cadence.",
  "I like the trajectory. Let me push back gently on a couple of points — space is hard, but the TAM is infinite.",
  "We're almost in orbit. Here's what I can realistically commit to and still keep my engineers from defecting to SpaceX.",
  "T-minus final offer. Let's close this and start fueling the rocket.",
];

function buildMessage(status, offer, counter, round) {
  if (status === 'accepted') {
    return `We have a deal! Houston, we have liftoff: $${offer.valuation}M valuation, $${offer.investment}M investment, ${offer.boardSeats} board seat${offer.boardSeats !== 1 ? 's' : ''}, ${offer.liquidationPref}x liquidation preference. Welcome aboard — let's go to orbit.`;
  }
  if (status === 'rejected') {
    if (round > MAX_ROUNDS) {
      return `We've been orbiting this deal too long without docking. I'll need to explore other launch partners. Thanks for your time — clear skies.`;
    }
    return `These terms would ground us before we even reach altitude — the dilution is too aggressive and the structure is too punitive. Mission abort on this round.`;
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

  const { valuation, investment, boardSeats, liquidationPref } = offer;
  if ([valuation, investment, boardSeats, liquidationPref].some(v => typeof v !== 'number' || v <= 0)) {
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
