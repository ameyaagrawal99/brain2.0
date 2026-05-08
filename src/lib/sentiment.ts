// AFINN-111 subset — scores range from -5 (very negative) to +5 (very positive)
const AFINN: Record<string, number> = {
  // +5
  outstanding: 5, superb: 5, ecstatic: 5, thrilled: 5, exhilarating: 5,
  // +4
  excellent: 4, amazing: 4, wonderful: 4, fantastic: 4, brilliant: 4,
  extraordinary: 4, spectacular: 4, awesome: 4, delightful: 4, phenomenal: 4,
  exceptional: 4, incredible: 4, remarkable: 4, splendid: 4, magnificent: 4,
  // +3
  great: 3, love: 3, loved: 3, loving: 3, happy: 3, happiness: 3,
  excited: 3, exciting: 3, joy: 3, joyful: 3, perfect: 3, best: 3,
  success: 3, successful: 3, celebrate: 3, celebrated: 3, triumph: 3,
  proud: 3, pride: 3, grateful: 3, gratitude: 3, confident: 3, confidence: 3,
  motivated: 3, inspiring: 3, inspired: 3, passionate: 3,
  // +2
  good: 2, glad: 2, nice: 2, positive: 2, enjoy: 2, enjoyed: 2,
  enjoying: 2, fun: 2, benefit: 2, beneficial: 2, helpful: 2, hope: 2,
  hopeful: 2, optimistic: 2, optimism: 2, comfortable: 2, support: 2,
  supported: 2, appreciate: 2, appreciated: 2, progress: 2, grow: 2,
  growth: 2, improve: 2, improved: 2, improving: 2, achieve: 2, achieved: 2,
  achievement: 2, opportunity: 2, opportunities: 2, like: 2, liked: 2,
  win: 2, winning: 2, won: 2, effective: 2, efficient: 2, easy: 2,
  clear: 2, clarity: 2, innovative: 2, innovation: 2, creative: 2,
  creativity: 2, productive: 2, productivity: 2, energized: 2, refreshed: 2,
  // +1
  ok: 1, okay: 1, fine: 1, decent: 1, adequate: 1, sufficient: 1,
  stable: 1, steady: 1, resolved: 1, completed: 1, done: 1, finish: 1,
  finished: 1, healthy: 1, calm: 1, relax: 1, relaxed: 1, rest: 1,
  learn: 1, learned: 1, learning: 1, discover: 1, discovered: 1,
  understand: 1, understood: 1, ready: 1, prepared: 1, simple: 1,
  // -1
  boring: -1, tired: -1, slow: -1, delay: -1, delayed: -1, issue: -1,
  issues: -1, concern: -1, concerns: -1, uncertain: -1, unclear: -1,
  minor: -1, lack: -1, lacking: -1, limit: -1, limited: -1, miss: -1,
  missed: -1, difficult: -1, difficulty: -1, challenge: -1, challenging: -1,
  busy: -1, overwhelmed: -1, stuck: -1, block: -1, blocked: -1,
  // -2
  bad: -2, wrong: -2, problem: -2, problems: -2, fail: -2, failed: -2,
  failure: -2, error: -2, errors: -2, bug: -2, bugs: -2, broken: -2,
  break: -2, broke: -2, disappoint: -2, disappointed: -2, disappointing: -2,
  frustrate: -2, frustrated: -2, frustrating: -2, frustration: -2,
  worry: -2, worried: -2, anxious: -2, anxiety: -2, struggle: -2,
  struggling: -2, risk: -2, risky: -2, complain: -2, complaint: -2,
  conflict: -2, confuse: -2, confused: -2, confusing: -2, confusion: -2,
  stress: -2, stressed: -2, stressful: -2, overwhelm: -2, pressure: -2,
  // -3
  terrible: -3, awful: -3, horrible: -3, worst: -3, hate: -3, hated: -3,
  hating: -3, angry: -3, anger: -3, upset: -3, miserable: -3, unhappy: -3,
  disaster: -3, crisis: -3, waste: -3, wasted: -3, reject: -3, rejected: -3,
  loss: -3, lose: -3, losing: -3, lost: -3, damage: -3, damaged: -3,
  suffer: -3, suffering: -3, hurt: -3, hurting: -3, pain: -3, painful: -3,
  // -4
  dreadful: -4, atrocious: -4, appalling: -4, devastating: -4, devastated: -4,
  hopeless: -4, desperate: -4, depressed: -4, depression: -4, broken: -4,
  collapse: -4, catastrophe: -4, catastrophic: -4, tragic: -4, tragedy: -4,
  // -5
  destroy: -5, destroyed: -5, fatal: -5, nightmare: -5, disaster: -5,
}

const NEGATIONS = new Set(['not', "n't", 'no', 'never', 'neither', 'nor', 'without', 'nobody', 'nothing', 'nowhere'])

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean)
}

export interface SentimentResult {
  score: number          // raw cumulative score
  comparative: number    // score per word (−1 to +1 range)
  positive: number       // count of positive words
  negative: number       // count of negative words
  label: 'Positive' | 'Neutral' | 'Negative'
}

export function analyzeSentiment(text: string): SentimentResult {
  const tokens = tokenize(text)
  let score = 0
  let positive = 0
  let negative = 0

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i]
    const wordScore = AFINN[word]
    if (wordScore === undefined) continue

    const negated = i > 0 && NEGATIONS.has(tokens[i - 1])
    const effective = negated ? -wordScore : wordScore

    score += effective
    if (effective > 0) positive++
    else if (effective < 0) negative++
  }

  const comparative = tokens.length > 0 ? score / tokens.length : 0
  const label: SentimentResult['label'] =
    comparative > 0.02 ? 'Positive' : comparative < -0.02 ? 'Negative' : 'Neutral'

  return { score, comparative, positive, negative, label }
}

export interface AggregatedSentiment {
  overall: SentimentResult['label']
  score: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  total: number
  positivePct: number
  negativePct: number
  neutralPct: number
  /** Normalised 0–100 gauge: 0 = very negative, 50 = neutral, 100 = very positive */
  gauge: number
}

export function aggregateSentiment(texts: string[]): AggregatedSentiment {
  let positiveCount = 0, negativeCount = 0, neutralCount = 0
  let totalScore = 0

  for (const text of texts) {
    if (!text.trim()) { neutralCount++; continue }
    const r = analyzeSentiment(text)
    totalScore += r.comparative
    if (r.label === 'Positive') positiveCount++
    else if (r.label === 'Negative') negativeCount++
    else neutralCount++
  }

  const total = texts.length || 1
  const avgComparative = totalScore / total

  const overall: SentimentResult['label'] =
    avgComparative > 0.02 ? 'Positive' : avgComparative < -0.02 ? 'Negative' : 'Neutral'

  // Clamp comparative to [-0.3, 0.3] then map to [0, 100]
  const clamped = Math.max(-0.3, Math.min(0.3, avgComparative))
  const gauge = Math.round(((clamped + 0.3) / 0.6) * 100)

  return {
    overall,
    score: avgComparative,
    positiveCount,
    negativeCount,
    neutralCount,
    total,
    positivePct: Math.round((positiveCount / total) * 100),
    negativePct: Math.round((negativeCount / total) * 100),
    neutralPct: Math.round((neutralCount / total) * 100),
    gauge,
  }
}
