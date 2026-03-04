// Buyer bot configuration — tweak these to change the bot's goals and limits.
const BOT_CONFIG = {
  price:          { ideal: 100, limit: 135, weight: 0.40 }, // buyer wants lower price
  paymentTerms:   { ideal: 90,  limit: 30,  weight: 0.25 }, // buyer wants more days to pay (Net 90)
  deliveryDays:   { ideal: 7,   limit: 21,  weight: 0.20 }, // buyer wants faster delivery
  contractMonths: { ideal: 3,   limit: 24,  weight: 0.15 }, // buyer wants shorter commitment
};

const MAX_ROUNDS = 6;
const ACCEPT_THRESHOLD = 0.72; // utility >= this → accept
const REJECT_THRESHOLD = 0.28; // utility < this → walk away

// Clamp a value to [0, 1]
function clamp(val) {
  return Math.max(0, Math.min(1, val));
}

// Score an incoming supplier offer from the buyer's perspective.
// Each term is normalized to [0,1] where 1 = buyer's ideal, 0 = buyer's limit.
// Returns a weighted utility score in [0, 1].
function scoreOffer(offer) {
  const c = BOT_CONFIG;
  const scores = {
    price:        clamp((c.price.limit - offer.price) / (c.price.limit - c.price.ideal)),
    paymentTerms:   clamp((offer.paymentTerms - c.paymentTerms.limit) / (c.paymentTerms.ideal - c.paymentTerms.limit)),
    deliveryDays:   clamp((c.deliveryDays.limit - offer.deliveryDays) / (c.deliveryDays.limit - c.deliveryDays.ideal)),
    contractMonths: clamp((c.contractMonths.limit - offer.contractMonths) / (c.contractMonths.limit - c.contractMonths.ideal)),
  };
  const utility =
    scores.price          * c.price.weight +
    scores.paymentTerms   * c.paymentTerms.weight +
    scores.deliveryDays   * c.deliveryDays.weight +
    scores.contractMonths * c.contractMonths.weight;
  return { utility, scores };
}

// Generate a counteroffer. The bot starts near its ideal and concedes
// toward the supplier's offer as rounds increase.
function generateCounter(offer, round) {
  const c = BOT_CONFIG;
  const factor = Math.min(0.78, round * 0.13); // concession grows each round, capped at 78%
  return {
    price:          Math.round(Math.min(c.price.limit,          c.price.ideal          + (offer.price          - c.price.ideal)          * factor)),
    paymentTerms:   Math.round(Math.max(c.paymentTerms.limit,   c.paymentTerms.ideal   + (offer.paymentTerms   - c.paymentTerms.ideal)   * factor)),
    deliveryDays:   Math.round(Math.min(c.deliveryDays.limit,   c.deliveryDays.ideal   + (offer.deliveryDays   - c.deliveryDays.ideal)   * factor)),
    contractMonths: Math.round(Math.min(c.contractMonths.limit, c.contractMonths.ideal + (offer.contractMonths - c.contractMonths.ideal) * factor)),
  };
}

const COUNTER_INTROS = [
  "Thanks for the offer. I'm not quite there yet —",
  "I appreciate you coming back. Still some ground to cover —",
  "We're making progress, but I need to push on a few terms —",
  "Getting closer. Let me show you where I can land —",
  "We're running low on rounds. Here's my best realistic position —",
  "Last chance to find a deal. Here's what I can genuinely commit to —",
];

function buildMessage(status, offer, counter, round) {
  if (status === 'accepted') {
    return `We have a deal! I'm happy to accept these terms: $${offer.price}/unit, Net ${offer.paymentTerms}, ${offer.deliveryDays}-day delivery, ${offer.contractMonths}-month contract. Looking forward to working together.`;
  }
  if (status === 'rejected') {
    if (round > MAX_ROUNDS) {
      return `We've used all our rounds and couldn't reach an agreement. I'll need to look at other suppliers. Thanks for your time.`;
    }
    return `These terms don't work for us — the gap is too wide, especially on price and payment terms. I'll have to walk away.`;
  }
  const intro = COUNTER_INTROS[Math.min(round - 1, COUNTER_INTROS.length - 1)];
  return intro;
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { offer, round = 1 } = req.body || {};

  if (!offer || typeof offer !== 'object') {
    return res.status(400).json({ error: 'Missing offer' });
  }

  const { price, paymentTerms, deliveryDays, contractMonths } = offer;
  if ([price, paymentTerms, deliveryDays, contractMonths].some(v => typeof v !== 'number' || v <= 0)) {
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
