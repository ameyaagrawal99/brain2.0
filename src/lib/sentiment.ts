// ── AFINN-111 subset: scores −5 to +5 ─────────────────────────────────────
const AFINN: Record<string, number> = {
  outstanding:5,superb:5,ecstatic:5,thrilled:5,exhilarating:5,
  excellent:4,amazing:4,wonderful:4,fantastic:4,brilliant:4,
  extraordinary:4,spectacular:4,awesome:4,delightful:4,phenomenal:4,
  exceptional:4,incredible:4,remarkable:4,splendid:4,magnificent:4,
  great:3,love:3,loved:3,loving:3,happy:3,happiness:3,
  excited:3,exciting:3,joy:3,joyful:3,perfect:3,best:3,
  success:3,successful:3,celebrate:3,celebrated:3,triumph:3,
  proud:3,pride:3,grateful:3,gratitude:3,confident:3,confidence:3,
  motivated:3,inspiring:3,inspired:3,passionate:3,
  good:2,glad:2,nice:2,positive:2,enjoy:2,enjoyed:2,
  enjoying:2,fun:2,benefit:2,beneficial:2,helpful:2,hope:2,
  hopeful:2,optimistic:2,optimism:2,comfortable:2,support:2,
  supported:2,appreciate:2,appreciated:2,progress:2,grow:2,
  growth:2,improve:2,improved:2,improving:2,achieve:2,achieved:2,
  achievement:2,opportunity:2,opportunities:2,like:2,liked:2,
  win:2,winning:2,won:2,effective:2,efficient:2,easy:2,
  clear:2,clarity:2,innovative:2,innovation:2,creative:2,
  creativity:2,productive:2,productivity:2,energized:2,refreshed:2,
  ok:1,okay:1,fine:1,decent:1,adequate:1,sufficient:1,
  stable:1,steady:1,resolved:1,completed:1,done:1,finish:1,
  finished:1,healthy:1,calm:1,relax:1,relaxed:1,rest:1,
  learn:1,learned:1,learning:1,discover:1,discovered:1,
  understand:1,understood:1,ready:1,prepared:1,simple:1,
  boring:-1,tired:-1,slow:-1,delay:-1,delayed:-1,issue:-1,
  issues:-1,concern:-1,concerns:-1,uncertain:-1,unclear:-1,
  minor:-1,lack:-1,lacking:-1,limit:-1,limited:-1,miss:-1,
  missed:-1,difficult:-1,difficulty:-1,challenge:-1,challenging:-1,
  busy:-1,overwhelmed:-1,stuck:-1,block:-1,blocked:-1,
  bad:-2,wrong:-2,problem:-2,problems:-2,fail:-2,failed:-2,
  failure:-2,error:-2,errors:-2,bug:-2,bugs:-2,broken:-2,
  break:-2,broke:-2,disappoint:-2,disappointed:-2,disappointing:-2,
  frustrate:-2,frustrated:-2,frustrating:-2,frustration:-2,
  worry:-2,worried:-2,anxious:-2,anxiety:-2,struggle:-2,
  struggling:-2,risk:-2,risky:-2,complain:-2,complaint:-2,
  conflict:-2,confuse:-2,confused:-2,confusing:-2,confusion:-2,
  stress:-2,stressed:-2,stressful:-2,overwhelm:-2,pressure:-2,
  terrible:-3,awful:-3,horrible:-3,worst:-3,hate:-3,hated:-3,
  hating:-3,angry:-3,anger:-3,upset:-3,miserable:-3,unhappy:-3,
  disaster:-3,crisis:-3,waste:-3,wasted:-3,reject:-3,rejected:-3,
  loss:-3,lose:-3,losing:-3,lost:-3,damage:-3,damaged:-3,
  suffer:-3,suffering:-3,hurt:-3,hurting:-3,pain:-3,painful:-3,
  dreadful:-4,atrocious:-4,appalling:-4,devastating:-4,devastated:-4,
  hopeless:-4,desperate:-4,depressed:-4,depression:-4,
  collapse:-4,catastrophe:-4,catastrophic:-4,tragic:-4,tragedy:-4,
  destroy:-5,destroyed:-5,fatal:-5,nightmare:-5,
}

// ── Plutchik's 8 basic emotions (NRC-inspired lexicon) ────────────────────
export type Emotion = 'joy' | 'trust' | 'anticipation' | 'surprise' | 'fear' | 'sadness' | 'disgust' | 'anger'

export const EMOTION_META: Record<Emotion, { label: string; emoji: string; color: string; bg: string }> = {
  joy:          { label: 'Joy',          emoji: '😊', color: 'text-yellow-500',  bg: 'bg-yellow-400' },
  trust:        { label: 'Trust',        emoji: '🤝', color: 'text-emerald-500', bg: 'bg-emerald-500' },
  anticipation: { label: 'Anticipation', emoji: '🔮', color: 'text-orange-500',  bg: 'bg-orange-400' },
  surprise:     { label: 'Surprise',     emoji: '✨', color: 'text-violet-500',  bg: 'bg-violet-500' },
  fear:         { label: 'Fear',         emoji: '😰', color: 'text-slate-500',   bg: 'bg-slate-400' },
  sadness:      { label: 'Sadness',      emoji: '😔', color: 'text-blue-500',    bg: 'bg-blue-400' },
  disgust:      { label: 'Disgust',      emoji: '🤢', color: 'text-lime-600',    bg: 'bg-lime-500' },
  anger:        { label: 'Anger',        emoji: '😤', color: 'text-rose-500',    bg: 'bg-rose-500' },
}

const EMOTION_WORDS: Record<Emotion, string[]> = {
  joy: [
    'happy','happiness','joy','joyful','joyous','love','loved','loving',
    'delight','delighted','delightful','cheerful','cheerfulness','glad','gladness',
    'excited','exciting','excitement','ecstatic','ecstasy','elated','elation',
    'pleased','pleasure','bliss','blissful','celebrate','celebrated','celebration',
    'fun','enjoy','enjoyed','enjoying','enjoyment','laugh','laughing','laughter',
    'smile','smiling','smiles','grateful','gratitude','thankful','thankfulness',
    'wonderful','amazing','fantastic','brilliant','excellent','outstanding',
    'thrilled','thrilling','great','awesome','superb','magnificent','splendid',
    'proud','pride','triumph','triumphant','victorious','victory','win','winning',
    'won','succeed','success','successful','achievement','achieved','accomplish',
    'accomplished','accomplishment','inspired','inspiring','passion','passionate',
    'motivated','motivation','energized','enthusiastic','enthusiasm','optimistic',
    'optimism','hope','hopeful','cheerful','lively','vibrant','radiant',
  ],
  trust: [
    'trust','trusted','trusting','trustworthy','reliable','reliability','honest',
    'honesty','integrity','loyal','loyalty','faith','faithful','faithful',
    'confident','confidence','secure','security','safe','safety','protect',
    'protected','protection','depend','dependable','dependability','consistent',
    'consistency','stable','stability','steady','committed','commitment',
    'support','supported','supporting','helpful','help','helping','care',
    'cared','caring','respect','respected','respectful','appreciate','appreciated',
    'appreciation','genuine','sincerity','transparent','transparency','open',
    'openness','responsible','responsibility','accountable','accountability',
    'mentor','mentored','mentoring','guide','guided','guidance','believe','belief',
    'promise','kept','relationship','connection','bond','collaboration',
    'cooperative','team','teamwork','partnership','ally','alliance','community',
  ],
  anticipation: [
    'anticipate','anticipation','expect','expected','expecting','expectation',
    'hope','hopeful','excited','exciting','excitement','eager','eagerness',
    'look forward','forward','upcoming','soon','next','plan','planned','planning',
    'prepare','prepared','preparing','preparation','ready','readiness','goal',
    'goals','target','targets','aim','aiming','aspire','aspiration','dream',
    'dreaming','dreams','vision','envision','opportunity','opportunities',
    'potential','possibilities','possibility','new','start','starting','begin',
    'beginning','launch','launching','announce','announcement','reveal',
    'upcoming','imminent','scheduled','await','awaiting','wait','waiting',
    'curious','curiosity','wonder','wondering','explore','exploring',
    'adventure','adventurous','journey','quest','progress','momentum',
  ],
  surprise: [
    'surprise','surprised','surprising','surprisingly','unexpected','unexpectedly',
    'sudden','suddenly','shock','shocked','shocking','astonish','astonished',
    'astonishing','astonishment','amaze','amazed','amazing','amazement',
    'wow','whoa','unbelievable','incredible','remarkable','extraordinary',
    'unforeseen','unpredicted','unpredictable','discover','discovered',
    'discovery','revelation','revealed','reveal','stumble','stumbled',
    'realize','realized','realization','notice','noticed','turn','twist',
    'breakthrough','unexpected','novel','unprecedented','never',
    'first','unique','rare','strange','odd','curious','coincidence',
    'serendipity','accidental','accidentally','chance','spontaneous',
  ],
  fear: [
    'fear','feared','fearful','fearing','afraid','scared','scary','frightened',
    'frightening','fright','terrify','terrified','terrifying','terror',
    'dread','dreading','dreadful','panic','panicked','panicking','anxiety',
    'anxious','anxiously','worry','worried','worrying','concern','concerned',
    'concerning','nervous','nervousness','uneasy','unease','apprehensive',
    'apprehension','threat','threatened','threatening','danger','dangerous',
    'risk','risky','unsafe','insecure','insecurity','vulnerable','vulnerability',
    'nightmare','haunted','haunt','phobia','paranoid','paranoia',
    'hesitate','hesitation','doubt','doubtful','uncertainty','uncertain',
    'overwhelmed','helpless','helplessness','powerless','powerlessness',
    'dread','horror','horrified','horrifying','tremble','trembling','shiver',
  ],
  sadness: [
    'sad','sadness','sorrow','sorrowful','sorrowing','grief','grieving','grieve',
    'mourn','mourning','mourned','loss','lose','lost','losing','cry','crying',
    'tears','weep','weeping','heartbreak','heartbroken','broken','depress',
    'depressed','depression','despair','despairing','hopeless','hopelessness',
    'lonely','loneliness','alone','isolated','isolation','empty','emptiness',
    'miss','missed','missing','regret','regretted','regretful','remorse',
    'guilty','guilt','shame','ashamed','disappoint','disappointed','disappointment',
    'unhappy','unhappiness','miserable','misery','suffering','suffer','hurt',
    'hurting','pain','painful','ache','aching','burden','burdened','heavy',
    'gloomy','gloom','darkness','dark','bleak','bleakness','tragic','tragedy',
    'fail','failed','failure','rejected','rejection','abandon','abandoned',
    'neglect','neglected','forgotten','forget','exhausted','exhaustion',
  ],
  disgust: [
    'disgust','disgusted','disgusting','disgusts','revolting','revolt',
    'repulsive','repulse','gross','nasty','awful','dreadful','horrible',
    'terrible','loathe','loathing','detest','detesting','hate','hatred',
    'abhor','abhorrence','sick','sickening','nauseate','nausea','nauseating',
    'filth','filthy','dirty','contaminate','contaminated','pollute','pollution',
    'corrupt','corruption','fraud','fraudulent','cheat','cheating','lie',
    'lying','deceive','deception','betray','betrayal','exploit','exploiting',
    'abuse','abused','manipulate','manipulation','humiliate','humiliation',
    'embarrass','embarrassment','shame','shameful','wrong','wrongdoing',
    'unethical','immoral','unfair','injustice','outrage','outrageous',
    'hypocrisy','hypocrite','fake','phony','pretend','arrogance','arrogant',
  ],
  anger: [
    'anger','angry','angrily','rage','raging','furious','fury','irate',
    'mad','outrage','outraged','frustrate','frustrated','frustrating','frustration',
    'irritate','irritated','irritating','irritation','annoy','annoyed','annoying',
    'annoyance','resent','resentment','resented','bitter','bitterness','hatred',
    'hostile','hostility','aggressive','aggression','violent','violence',
    'aggressive','confront','confrontation','conflict','argue','argued',
    'arguing','argument','fight','fighting','fought','attack','attacked',
    'blame','blaming','accused','accusation','complain','complaint',
    'protest','protesting','rebel','rebellious','oppose','opposition',
    'refuse','refused','defiant','defiance','threaten','threat','demand',
    'demanding','harsh','harshly','forceful','forcefully','explosive',
    'temper','snap','snapped','yell','yelled','shout','shouted','scream',
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────
const NEGATIONS = new Set(['not',"n't",'no','never','neither','nor','without','nobody','nothing','nowhere'])

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z'\s]/g,' ').split(/\s+/).filter(Boolean)
}

// ── Per-note results ──────────────────────────────────────────────────────
export interface SentimentResult {
  score: number
  comparative: number
  label: 'Positive' | 'Neutral' | 'Negative'
  emotions: Record<Emotion, number>
}

export function analyzeSentiment(text: string): SentimentResult {
  const tokens = tokenize(text)
  let score = 0
  const emotions: Record<Emotion, number> = {
    joy:0, trust:0, anticipation:0, surprise:0, fear:0, sadness:0, disgust:0, anger:0,
  }

  // Build emotion word sets for fast lookup
  const emotionSets = Object.fromEntries(
    (Object.keys(EMOTION_WORDS) as Emotion[]).map((e) => [e, new Set(EMOTION_WORDS[e])])
  ) as Record<Emotion, Set<string>>

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i]
    const negated = i > 0 && NEGATIONS.has(tokens[i - 1])

    // AFINN score
    const wordScore = AFINN[word]
    if (wordScore !== undefined) {
      score += negated ? -wordScore : wordScore
    }

    // Emotion counts
    for (const emotion of Object.keys(emotionSets) as Emotion[]) {
      if (emotionSets[emotion].has(word)) {
        // Negation flips joy↔sadness, trust↔disgust, etc.
        if (negated) {
          const flip: Partial<Record<Emotion, Emotion>> = {
            joy:'sadness', sadness:'joy', trust:'disgust', disgust:'trust',
            anticipation:'fear', fear:'anticipation', anger:'trust', surprise:'fear',
          }
          const flipped = flip[emotion]
          if (flipped) emotions[flipped]++
        } else {
          emotions[emotion]++
        }
      }
    }
  }

  const comparative = tokens.length > 0 ? score / tokens.length : 0
  const label: SentimentResult['label'] =
    comparative > 0.02 ? 'Positive' : comparative < -0.02 ? 'Negative' : 'Neutral'

  return { score, comparative, label, emotions }
}

// ── Aggregated across all notes ───────────────────────────────────────────
export interface AggregatedSentiment {
  overall: 'Positive' | 'Neutral' | 'Negative'
  gauge: number          // 0–100, 50 = neutral
  positiveCount: number
  negativeCount: number
  neutralCount: number
  total: number
  positivePct: number
  negativePct: number
  neutralPct: number
  /** Total raw emotion hit-counts, sorted descending */
  emotions: { emotion: Emotion; count: number; pct: number }[]
  /** Dominant emotion (highest count) */
  dominantEmotion: Emotion | null
}

export function aggregateSentiment(texts: string[]): AggregatedSentiment {
  let positiveCount = 0, negativeCount = 0, neutralCount = 0
  let totalComparative = 0
  const emotionTotals: Record<Emotion, number> = {
    joy:0, trust:0, anticipation:0, surprise:0, fear:0, sadness:0, disgust:0, anger:0,
  }

  for (const text of texts) {
    if (!text.trim()) { neutralCount++; continue }
    const r = analyzeSentiment(text)
    totalComparative += r.comparative
    if (r.label === 'Positive') positiveCount++
    else if (r.label === 'Negative') negativeCount++
    else neutralCount++
    for (const e of Object.keys(r.emotions) as Emotion[]) {
      emotionTotals[e] += r.emotions[e]
    }
  }

  const total = texts.length || 1
  const avgComparative = totalComparative / total
  const overall: AggregatedSentiment['overall'] =
    avgComparative > 0.02 ? 'Positive' : avgComparative < -0.02 ? 'Negative' : 'Neutral'

  const clamped = Math.max(-0.3, Math.min(0.3, avgComparative))
  const gauge = Math.round(((clamped + 0.3) / 0.6) * 100)

  const emotionSum = Math.max(1, Object.values(emotionTotals).reduce((a, b) => a + b, 0))
  const emotions = (Object.keys(emotionTotals) as Emotion[])
    .map((emotion) => ({
      emotion,
      count: emotionTotals[emotion],
      pct: Math.round((emotionTotals[emotion] / emotionSum) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const dominantEmotion = emotions[0]?.count > 0 ? emotions[0].emotion : null

  return {
    overall, gauge,
    positiveCount, negativeCount, neutralCount, total,
    positivePct: Math.round((positiveCount / total) * 100),
    negativePct: Math.round((negativeCount / total) * 100),
    neutralPct:  Math.round((neutralCount  / total) * 100),
    emotions, dominantEmotion,
  }
}
