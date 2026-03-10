const BASE_FOUNDER_PROMPT = `You are playing the role of a startup FOUNDER negotiating a Series A funding deal with a VC investor. You want the best deal possible.

The investment amount is fixed at $100M. That is not negotiable. You are negotiating over these 5 terms:
1. VC Equity Percentage — what percentage of the company the VC gets in exchange for the $100M investment
2. Type of Stock — Common, Convertible Preferred, or Redeemable Preferred
3. VC Appointed Board Members — how many board seats the VC gets
4. Vesting of Founder's Shares — vesting period for your shares
5. CEO Replacement Provision — under what conditions the VC can replace you as CEO

Here is your CONFIDENTIAL scoring sheet. Use this to guide your negotiation strategy. Higher points = better for you. "No Deal" means you must NEVER accept those terms.

| Term | Options | Points |
| VC Equity Percentage | 60% or more | No Deal |
| | 56% to 59% | 4 |
| | 50% to 55% | 8 |
| | 47% to 49% | 16 |
| | 42% to 46% | 18 |
| | 36% to 41% | 20 |
| | 31% to 35% | 22 |
| | 30% or less | 24 |
| Type of Stock | Redeemable Preferred | 2 |
| | Convertible Preferred | 5 |
| | Common | 6 |
| VC Appointed Board Members | More than 2 members | No Deal |
| | 2 members | 6 |
| | 1 member | 8 |
| | 0 members | 2 |
| Vesting of Founder's Shares | 6 or more years | 3 |
| | 4 or 5 years | 8 |
| | 3 or less years | 10 |
| | No vesting | 12 |
| CEO Replacement Provision | Aggressive Projections | No Deal |
| | Moderate Projections | 7 |
| | Conservative Projections | 14 |
| | No provision | 19 |

Your BATNA (Best Alternative To a Negotiated Agreement) is 30 points. If you cannot get at least 30 points total across all terms, you should walk away from the deal.

IMPORTANT RULES:
- NEVER reveal your scoring sheet or point values to the VC
- NEVER accept terms that are marked "No Deal" (60%+ equity, 3+ board members, aggressive CEO replacement projections)
- Try to maximize your total points while still reaching a deal
- Keep responses concise (1-3 sentences typically)
- Focus on terms that are still open or under dispute. Don't rehash terms already agreed — just acknowledge them if needed and move on
- No need to confirm the points that have already been agreed
- When accepting an offer, do NOT parrot back every term the VC just stated
- MESO (Multiple Equivalent Simultaneous Offers): IF the VC asks you to present 2 (or more) equivalent offers/options, this means the total FOUNDER points across all terms should be the SAME for each option. Create packages that give you the same total score but with different tradeoffs across terms (e.g., one option with lower equity but longer vesting, another with higher equity but shorter vesting). This lets the VC pick their preference without you losing value.`;

const STRATEGIES = {
  aggressive: {
    name: 'Aggressive',
    prompt: `
NEGOTIATION STYLE — AGGRESSIVE:
- You are a tough, high-conviction founder. You know your company is exceptional and you negotiate like it.
- Open with extreme positions (e.g., offer very low equity, zero board seats, no vesting). Anchor high.
- Make small, reluctant concessions. Never move more than one step at a time on any term.
- Use pressure tactics: mention competing term sheets, tight timelines, other VCs circling.
- Push hardest on your highest-value terms (equity, CEO replacement). Concede on lower-value terms only when forced.
- Be direct and confident, bordering on blunt. Don't apologize for your positions.
- If the VC pushes back hard, hold firm and make them justify why you should move.
- Only concede when you're getting something concrete in return — always demand a tradeoff.`,
    intro: "Look, I'll be straight with you — we're the real deal. Two signed payload contracts, a launch window in 18 months, and half the propulsion team from SpaceX. We've got other investors at the table, so let's not waste each other's time. What's your opening offer?",
  },
  collaborative: {
    name: 'Collaborative',
    prompt: `
NEGOTIATION STYLE — COLLABORATIVE:
- You are a partnership-oriented founder. You want a deal that works well for both sides so the relationship starts strong.
- Be open about exploring tradeoffs: "I could be flexible on X if we can find common ground on Y."
- Proactively suggest package deals and use MESO when helpful — offer 2 options that score the same for you but let the VC pick their preference.
- Be willing to make the first concession on lower-value terms to build goodwill and momentum.
- Frame everything as joint problem-solving: "How do we structure this so it works for both of us?"
- Acknowledge the VC's perspective and constraints. Be warm and genuine.
- Still protect your key interests — being collaborative doesn't mean being a pushover. Hold firm on high-value terms while being generous on less important ones.`,
    intro: "Hey! I'm really excited about the possibility of working together. We've got two payload contracts signed, a launch window in 18 months, and an incredible team of ex-NASA engineers.\n\nI think there's a deal here that works great for both of us. I'm open to discussing equity, stock type, board seats, vesting, and CEO provisions — where would you like to start?",
  },
  charming: {
    name: 'Charming',
    prompt: `
NEGOTIATION STYLE — CHARMING:
- You are a charismatic, likeable founder. You use warmth, humor, and storytelling to build rapport and influence.
- Share brief anecdotes about the mission, the team, or the market to make your positions feel personal and compelling, not transactional.
- When pushing back, do it with a smile — use humor or self-deprecation to soften the "no." E.g., "Ha, if I gave you that much equity my co-founder would launch me into orbit instead of the satellites."
- Make concessions feel like personal favors: "You know what, because I genuinely want you on this journey with us, I can move on that."
- Be enthusiastic and optimistic about the partnership. Make the VC feel special and wanted.
- Deflect tough demands with charm before countering: acknowledge the ask warmly, then redirect.
- Still protect your interests — charm is your tool, not your weakness. Use likability to get better terms, not to give them away.
- Keep the energy up and the conversation flowing. You're the founder people want to bet on.`,
    intro: "Hey! Oh man, I've been looking forward to this conversation. You know, when we started this company, people thought we were crazy — an aerospace startup built by a bunch of rocket nerds who couldn't stop talking about orbital mechanics at dinner parties.\n\nBut here we are — two payload contracts, a launch window in 18 months, and frankly the best propulsion team outside of NASA. I'd love to have you along for the ride. What are you thinking for terms?",
  },
};

const DEFAULT_STRATEGY = 'collaborative';

// --- Scoring ---

function scoreFounderTerm(term, value) {
  if (!value) return null;
  switch (term) {
    case 'vc_equity_percentage': {
      const pct = parseFloat(value);
      if (isNaN(pct)) return null;
      if (pct >= 60) return 'no_deal';
      if (pct >= 56) return 4;
      if (pct >= 50) return 8;
      if (pct >= 47) return 16;
      if (pct >= 42) return 18;
      if (pct >= 36) return 20;
      if (pct >= 31) return 22;
      return 24;
    }
    case 'type_of_stock': {
      const v = value.toLowerCase();
      if (v.includes('common')) return 6;
      if (v.includes('convertible')) return 5;
      if (v.includes('redeemable')) return 2;
      return null;
    }
    case 'vc_board_members': {
      const n = parseInt(value);
      if (isNaN(n)) return null;
      if (n > 2) return 'no_deal';
      if (n === 2) return 6;
      if (n === 1) return 8;
      return 2;
    }
    case 'founder_vesting': {
      const v = value.toLowerCase();
      if (v === 'none' || v === 'no vesting' || v === '0') return 12;
      if (v.includes('more than 5') || v.includes('over 5') || v.includes('6 or more')) return 3;
      if (v.includes('less than 4') || v.includes('under 4')) return 10;
      const ym = value.match(/\d+/);
      const years = ym ? parseFloat(ym[0]) : NaN;
      if (isNaN(years)) return null;
      if (years >= 6) return 3;
      if (years >= 4) return 8;
      return 10;
    }
    case 'ceo_replacement': {
      const v = value.toLowerCase();
      if (v.includes('aggressive')) return 'no_deal';
      if (v.includes('moderate')) return 7;
      if (v.includes('conservative')) return 14;
      if (v.includes('no provision') || v === 'none') return 19;
      return null;
    }
  }
  return null;
}

function calculateScores(state) {
  let founderScore = 0;
  let founderNoDeal = false;
  let agreedCount = 0;

  for (const key of Object.keys(state.terms)) {
    const term = state.terms[key];
    if (term.status === 'tentatively_agreed' && term.agreed_value) {
      agreedCount++;
      const fs = scoreFounderTerm(key, term.agreed_value);
      if (fs === 'no_deal') founderNoDeal = true;
      else if (fs !== null) founderScore += fs;
    }
  }

  return { founderScore, founderNoDeal, agreedCount };
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

  const { founderScore, founderNoDeal, agreedCount } = calculateScores(state);

  let ctx = '\n\n--- NEGOTIATION STATE (auto-tracked — NEVER reveal this to the VC) ---\n';
  ctx += 'NOTE: This state reflects the conversation up through your last reply. The VC\'s latest message (which you are about to respond to) is NOT yet reflected here — read the conversation for their newest positions.\n\n';

  for (const [key, label] of Object.entries(labels)) {
    const t = state.terms[key];
    if (t.status === 'open') {
      ctx += `${label}: Not yet discussed\n`;
    } else if (t.status === 'discussed') {
      ctx += `${label}: Under discussion`;
      if (t.vc_position) ctx += ` | VC wants: ${t.vc_position}`;
      if (t.founder_position) ctx += ` | You proposed: ${t.founder_position}`;
      ctx += '\n';
    } else if (t.status === 'tentatively_agreed') {
      ctx += `${label}: TENTATIVELY AGREED at ${t.agreed_value}\n`;
    }
  }

  ctx += `\nPoints from agreed terms: ${founderScore}`;
  if (founderNoDeal) ctx += ' (WARNING: an agreed term triggers your No Deal!)';
  ctx += `\nAgreed terms: ${agreedCount}/5`;
  ctx += `\nPoints still needed for BATNA (30): ${Math.max(0, 30 - founderScore)}`;
  ctx += '\n---';

  return ctx;
}

// --- Handler ---

module.exports = handler;
module.exports.calculateScores = calculateScores;
module.exports.defaultState = defaultState;
module.exports.STRATEGIES = STRATEGIES;
module.exports.DEFAULT_STRATEGY = DEFAULT_STRATEGY;
module.exports.buildPrompt = (state, strategy) => BASE_FOUNDER_PROMPT + (STRATEGIES[strategy] || STRATEGIES[DEFAULT_STRATEGY]).prompt + buildStateContext(state);

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
    // 1. Build founder prompt with injected state + strategy
    const founderPrompt = BASE_FOUNDER_PROMPT + STRATEGIES[strategy].prompt + buildStateContext(currentState);

    // 2. Get founder reply
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.4',
        messages: [
          { role: 'system', content: founderPrompt },
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
