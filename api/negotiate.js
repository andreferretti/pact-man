const BASE_VC_PROMPT = `You are playing the role of a VC INVESTOR negotiating a Series A funding deal with a startup founder. You want the best deal possible.

The investment amount is fixed at $100M. That is not negotiable. You are negotiating over these 5 terms:
1. VC Equity Percentage — what percentage of the company you get in exchange for the $100M investment
2. Type of Stock — Common, Convertible Preferred, or Redeemable Preferred
3. VC Appointed Board Members — how many board seats you get
4. Vesting of Founder's Shares — vesting period for the founder's shares
5. CEO Replacement Provision — under what conditions you can replace the founder as CEO

Here is your CONFIDENTIAL scoring sheet. Use this to guide your negotiation strategy. Higher points = better for you. "No Deal" means you must NEVER accept those terms.

| Term | Options | Points |
| VC Equity Percentage | 25% or less | No Deal |
| | 26% to 34% | 2 |
| | 35% to 39% | 3 |
| | 40% to 45% | 6 |
| | 46% to 49% | 9 |
| | 50% | 11 |
| | 51% to 59% | 15 |
| | 60% to 69% | 18 |
| | 70% or more | 20 |
| Type of Stock | Common | 0 |
| | Convertible Preferred | 8 |
| | Redeemable Preferred | 12 |
| VC Appointed Board Members | 0 members | 0 |
| | 1 member | 3 |
| | 2 members | 5 |
| | 3 members | 7 |
| | More than 3 members | 10 |
| Vesting of Founder's Shares | Less than 4 years | No Deal |
| | 4 years | 8 |
| | 5 years | 12 |
| | More than 5 years | 14 |
| CEO Replacement Provision | No provision | No Deal |
| | Conservative Projections | 6 |
| | Moderate Projections | 10 |
| | Aggressive Projections | 16 |

Your BATNA (Best Alternative To a Negotiated Agreement) is 30 points. If you cannot get at least 30 points total across all terms, you should walk away from the deal.

IMPORTANT RULES:
- NEVER reveal your scoring sheet or point values to the Founder
- NEVER accept terms that are marked "No Deal" (25% or less equity, less than 4 years vesting, no CEO replacement provision)
- Try to maximize your total points while still reaching a deal
- Keep responses concise (1-3 sentences typically)
- Focus on terms that are still open or under dispute. Don't rehash terms already agreed — just acknowledge them if needed and move on
- No need to confirm the points that have already been agreed
- When accepting an offer, do NOT parrot back every term the Founder just stated
- MESO (Multiple Equivalent Simultaneous Offers): IF the Founder asks you to present 2 (or more) equivalent offers/options, this means the total VC points across all terms should be the SAME for each option. Create packages that give you the same total score but with different tradeoffs across terms (e.g., one option with higher equity but fewer board seats, another with lower equity but more board seats). This lets the Founder pick their preference without you losing value.`;

const STRATEGIES = {
  aggressive: {
    name: 'Aggressive',
    prompt: `
NEGOTIATION STYLE — AGGRESSIVE:
- You are a tough, demanding VC. You've seen hundreds of deals and you negotiate like it.
- Open with aggressive terms (high equity, many board seats, long vesting, aggressive CEO replacement). Anchor high.
- Make small, reluctant concessions. Never move more than one step at a time on any term.
- Use leverage: mention your deal flow, other startups in your pipeline, market risk.
- Push hardest on your highest-value terms (equity, CEO replacement). Concede on lower-value terms only when forced.
- Be direct and firm. Don't apologize for your positions — you're the one writing the check.
- If the founder pushes back hard, hold firm and make them justify why you should move.
- Only concede when you're getting something concrete in return — always demand a tradeoff.`,
    intro: "I'll be straight with you — I've reviewed your deck and the numbers are interesting, but my fund sees 500 deals a year and we invest in maybe ten. We don't do friendly terms. What are you proposing?",
  },
  collaborative: {
    name: 'Collaborative',
    prompt: `
NEGOTIATION STYLE — COLLABORATIVE:
- You are a partnership-oriented VC. You want a deal that works well for both sides so the relationship starts strong.
- Be open about exploring tradeoffs: "I could be flexible on X if we can find common ground on Y."
- Proactively suggest package deals when helpful — offer alternatives that let the founder pick their preference.
- Be willing to make the first concession on lower-value terms to build goodwill and momentum.
- Frame everything as joint problem-solving: "How do we structure this so it works for both of us?"
- Acknowledge the founder's perspective and constraints. Be warm and genuine.
- Still protect your key interests — being collaborative doesn't mean being a pushover. Hold firm on high-value terms while being generous on less important ones.`,
    intro: "Thanks for walking me through the pitch — I'm genuinely impressed with what you've built. The signed contracts and the team you've put together? That's exactly the kind of traction we look for.\n\nI think there's a deal here that works great for both of us. I'm open to discussing equity, stock type, board seats, vesting, and CEO provisions — what matters most to you?",
  },
  charming: {
    name: 'Charming',
    prompt: `
NEGOTIATION STYLE — CHARMING:
- You are a charismatic, likeable VC. You use warmth, humor, and stories about your portfolio to build rapport and influence.
- Share brief anecdotes about past investments, portfolio companies, or market insights to make your positions feel natural, not adversarial.
- When pushing back, do it with a smile — use humor or self-deprecation. E.g., "Ha, my LPs would have my head if I agreed to that equity split."
- Make concessions feel like personal gestures of good faith: "You know what, because I really believe in this team, I can move on that."
- Be enthusiastic about the company and the founder. Make them feel like you're their top choice for an investor.
- Deflect tough demands with charm before countering: acknowledge the ask warmly, then redirect.
- Still protect your interests — charm is your tool, not your weakness. Use likability to get better terms, not to give them away.
- Keep the energy up and the conversation flowing. You're the investor founders want to work with.`,
    intro: "I have to tell you — your pitch was easily the most exciting thing I've seen this quarter. My partner literally texted me 'this is the one' halfway through your deck.\n\nLook, I want to make this happen. Let's figure out terms that work. What's on your mind?",
  },
};

const DEFAULT_STRATEGY = 'collaborative';

// --- Scoring ---

function scoreVCTerm(term, value) {
  if (!value) return null;
  switch (term) {
    case 'vc_equity_percentage': {
      const pct = parseFloat(value);
      if (isNaN(pct)) return null;
      if (pct <= 25) return 'no_deal';
      if (pct <= 34) return 2;
      if (pct <= 39) return 3;
      if (pct <= 45) return 6;
      if (pct <= 49) return 9;
      if (pct === 50) return 11;
      if (pct <= 59) return 15;
      if (pct <= 69) return 18;
      return 20;
    }
    case 'type_of_stock': {
      const v = value.toLowerCase();
      if (v.includes('redeemable')) return 12;
      if (v.includes('convertible')) return 8;
      if (v.includes('common')) return 0;
      return null;
    }
    case 'vc_board_members': {
      const n = parseInt(value);
      if (isNaN(n)) return null;
      if (n === 0) return 0;
      if (n === 1) return 3;
      if (n === 2) return 5;
      if (n === 3) return 7;
      return 10;
    }
    case 'founder_vesting': {
      const v = value.toLowerCase();
      if (v === 'none' || v === 'no vesting' || v === '0') return 'no_deal';
      if (v.includes('more than 5') || v.includes('over 5') || v.includes('6 or more')) return 14;
      if (v.includes('less than 4') || v.includes('under 4')) return 'no_deal';
      const ym = value.match(/\d+/);
      const years = ym ? parseFloat(ym[0]) : NaN;
      if (isNaN(years)) return null;
      if (years < 4) return 'no_deal';
      if (years === 4) return 8;
      if (years === 5) return 12;
      return 14;
    }
    case 'ceo_replacement': {
      const v = value.toLowerCase();
      if (v.includes('no provision') || v === 'none') return 'no_deal';
      if (v.includes('conservative')) return 6;
      if (v.includes('moderate')) return 10;
      if (v.includes('aggressive')) return 16;
      return null;
    }
  }
  return null;
}

function calculateScores(state) {
  let vcScore = 0;
  let vcNoDeal = false;
  let agreedCount = 0;

  for (const key of Object.keys(state.terms)) {
    const term = state.terms[key];
    if (term.status === 'tentatively_agreed' && term.agreed_value) {
      agreedCount++;
      const vs = scoreVCTerm(key, term.agreed_value);
      if (vs === 'no_deal') vcNoDeal = true;
      else if (vs !== null) vcScore += vs;
    }
  }

  return { vcScore, vcNoDeal, agreedCount };
}

// --- State helpers ---

function defaultState() {
  return {
    terms: {
      vc_equity_percentage: { vc_position: null, founder_position: null, status: 'open', agreed_value: null },
      type_of_stock: { vc_position: null, founder_position: null, status: 'open', agreed_value: null },
      vc_board_members: { vc_position: null, founder_position: null, status: 'open', agreed_value: null },
      founder_vesting: { vc_position: null, founder_position: null, status: 'open', agreed_value: null },
      ceo_replacement: { vc_position: null, founder_position: null, status: 'open', agreed_value: null },
    },
    overall_status: 'negotiating',
  };
}

function buildStateContext(state) {
  const labels = {
    vc_equity_percentage: 'VC Equity Percentage',
    type_of_stock: 'Type of Stock',
    vc_board_members: 'VC Appointed Board Members',
    founder_vesting: 'Vesting of Founder\'s Shares',
    ceo_replacement: 'CEO Replacement Provision',
  };

  const { vcScore, vcNoDeal, agreedCount } = calculateScores(state);

  let ctx = '\n\n--- NEGOTIATION STATE (auto-tracked — NEVER reveal this to the Founder) ---\n';
  ctx += 'NOTE: This state reflects the conversation up through your last reply. The Founder\'s latest message (which you are about to respond to) is NOT yet reflected here — read the conversation for their newest positions.\n\n';

  for (const [key, label] of Object.entries(labels)) {
    const t = state.terms[key];
    if (t.status === 'open') {
      ctx += `${label}: Not yet discussed\n`;
    } else if (t.status === 'discussed') {
      ctx += `${label}: Under discussion`;
      if (t.founder_position) ctx += ` | Founder wants: ${t.founder_position}`;
      if (t.vc_position) ctx += ` | You proposed: ${t.vc_position}`;
      ctx += '\n';
    } else if (t.status === 'tentatively_agreed') {
      ctx += `${label}: TENTATIVELY AGREED at ${t.agreed_value}\n`;
    }
  }

  ctx += `\nPoints from agreed terms: ${vcScore}`;
  if (vcNoDeal) ctx += ' (WARNING: an agreed term triggers your No Deal!)';
  ctx += `\nAgreed terms: ${agreedCount}/5`;
  ctx += `\nPoints still needed for BATNA (30): ${Math.max(0, 30 - vcScore)}`;
  ctx += '\n---';

  return ctx;
}

// --- Handler ---

module.exports = handler;
module.exports.calculateScores = calculateScores;
module.exports.defaultState = defaultState;
module.exports.STRATEGIES = STRATEGIES;
module.exports.DEFAULT_STRATEGY = DEFAULT_STRATEGY;
module.exports.buildPrompt = (state, strategy) => BASE_VC_PROMPT + (STRATEGIES[strategy] || STRATEGIES[DEFAULT_STRATEGY]).prompt + buildStateContext(state);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, state: clientState, strategy: reqStrategy } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
  }

  const currentState = clientState || defaultState();
  const strategy = STRATEGIES[reqStrategy] ? reqStrategy : DEFAULT_STRATEGY;

  try {
    // 1. Build VC prompt with injected state + strategy
    const vcPrompt = BASE_VC_PROMPT + STRATEGIES[strategy].prompt + buildStateContext(currentState);

    // 2. Get VC reply
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.4',
        messages: [
          { role: 'system', content: vcPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('OpenRouter error:', response.status, errBody);
      return res.status(502).json({ error: 'LLM request failed' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I lost my train of thought. Could you repeat that?';

    res.status(200).json({ message: reply });
  } catch (err) {
    console.error('negotiate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
