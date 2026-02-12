import type { LyricsAnalysis } from '../types.js';

const THEME_KEYWORDS: Record<string, string[]> = {
  romance: ['love', 'heart', 'miss', 'kiss', 'baby', 'darling', 'hold me', 'together', 'forever', 'sweetheart', 'beloved', 'desire', 'passion', 'embrace'],
  heartbreak: ['broken', 'goodbye', 'leave', 'left me', 'tears', 'cry', 'over you', 'let go', 'hurt', 'apart', 'lost you', 'without you', 'moved on'],
  wealth: ['money', 'cash', 'rich', 'dollar', 'bank', 'drip', 'ice', 'flex', 'bands', 'racks', 'guap', 'bag', 'balling'],
  aggression: ['fight', 'kill', 'war', 'gun', 'shoot', 'blood', 'enemy', 'battle', 'destroy', 'rage', 'fury', 'violent'],
  party: ['party', 'drink', 'club', 'dance', 'tonight', 'turn up', 'lit', 'vibe', 'bottle', 'shots', 'celebrate', 'weekend'],
  sadness: ['cry', 'alone', 'pain', 'empty', 'dark', 'hopeless', 'lost', 'numb', 'suffer', 'drown', 'falling', 'broken inside'],
  freedom: ['free', 'road', 'fly', 'escape', 'run', 'wind', 'sky', 'open', 'wild', 'wander', 'drift'],
  nostalgia: ['remember', 'back then', 'used to', 'old days', 'memories', 'childhood', 'hometown', 'young', 'those days', 'way back'],
  spirituality: ['god', 'pray', 'soul', 'heaven', 'faith', 'blessed', 'angel', 'grace', 'holy', 'spirit', 'divine', 'salvation'],
  anxiety: ['scared', 'worried', 'panic', 'nervous', 'can\'t breathe', 'racing', 'overthink', 'restless', 'insomnia', 'paranoid', 'stress'],
  empowerment: ['strong', 'power', 'queen', 'king', 'boss', 'unstoppable', 'rise', 'conquer', 'fearless', 'champion', 'stand up'],
  drugs: ['high', 'smoke', 'lean', 'pill', 'weed', 'trip', 'blunt', 'rolling', 'codeine', 'molly', 'xan'],
};

const POSITIVE_WORDS = new Set([
  'happy', 'joy', 'love', 'beautiful', 'amazing', 'wonderful', 'great', 'good',
  'smile', 'laugh', 'sunshine', 'bright', 'light', 'hope', 'dream', 'perfect',
  'best', 'glory', 'paradise', 'bliss', 'alive', 'free', 'peace', 'warm',
  'fun', 'celebrate', 'sweet', 'golden', 'magic', 'blessed',
]);

const NEGATIVE_WORDS = new Set([
  'sad', 'pain', 'hurt', 'cry', 'dark', 'death', 'hate', 'fear', 'alone',
  'broken', 'lost', 'empty', 'cold', 'dead', 'suffer', 'misery', 'doom',
  'hell', 'evil', 'blood', 'scream', 'burn', 'destroy', 'fall', 'drown',
  'nightmare', 'rage', 'sorrow', 'despair', 'agony', 'torment', 'wicked',
]);

const INTENSITY_MODIFIERS = new Set([
  'very', 'so', 'really', 'fucking', 'damn', 'extremely', 'absolutely',
  'completely', 'totally', 'deeply', 'truly', 'incredibly',
]);

const NEGATION_WORDS = new Set([
  'not', 'no', "don't", "doesn't", "didn't", "won't", "can't", "couldn't",
  "wouldn't", "shouldn't", 'never', 'nothing', 'nobody', 'nowhere', "isn't", "aren't",
]);

const VIBE_COMBOS: Array<{ keywords: string[]; vibe: string; minMatches: number }> = [
  { keywords: ['truck', 'beer', 'girl', 'road', 'country', 'dirt', 'boots'], vibe: 'drinking country', minMatches: 2 },
  { keywords: ['trap', 'dark', 'gun', 'gang', 'drip', 'street'], vibe: 'dark trap', minMatches: 2 },
  { keywords: ['bass', 'drop', 'rave', 'dance', 'beat', 'club'], vibe: 'club banger', minMatches: 2 },
  { keywords: ['love', 'heart', 'slow', 'soft', 'gentle', 'hold'], vibe: 'love ballad', minMatches: 2 },
  { keywords: ['grind', 'hustle', 'money', 'stack', 'work', 'paper'], vibe: 'hustle anthem', minMatches: 2 },
  { keywords: ['space', 'stars', 'float', 'dream', 'cosmos', 'galaxy'], vibe: 'cosmic', minMatches: 2 },
  { keywords: ['ocean', 'wave', 'beach', 'surf', 'island', 'tropical'], vibe: 'tropical chill', minMatches: 2 },
  { keywords: ['pray', 'god', 'church', 'faith', 'worship', 'gospel'], vibe: 'gospel soul', minMatches: 2 },
  { keywords: ['fight', 'rage', 'scream', 'metal', 'heavy', 'blast'], vibe: 'aggressive metal', minMatches: 2 },
  { keywords: ['summer', 'sun', 'pool', 'vacation', 'party', 'fun'], vibe: 'summer anthem', minMatches: 2 },
  { keywords: ['midnight', 'neon', 'drive', 'city', 'synth', 'retro'], vibe: 'synthwave noir', minMatches: 2 },
  { keywords: ['rain', 'window', 'coffee', 'quiet', 'morning', 'soft'], vibe: 'indie coffeehouse', minMatches: 2 },
];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
}

export function analyzeLyrics(lyrics: string): LyricsAnalysis {
  const lowerLyrics = lyrics.toLowerCase();
  const words = tokenize(lyrics);

  // Theme extraction
  const themes: string[] = [];
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const matchCount = keywords.filter(kw => lowerLyrics.includes(kw)).length;
    if (matchCount >= 2) {
      themes.push(theme);
    }
  }

  // Sentiment scoring with negation and intensity
  let positiveScore = 0;
  let negativeScore = 0;
  let intensityMultiplier = 1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (INTENSITY_MODIFIERS.has(word)) {
      intensityMultiplier = 1.5;
      continue;
    }

    const isNegated = i > 0 && NEGATION_WORDS.has(words[i - 1]);

    if (POSITIVE_WORDS.has(word)) {
      if (isNegated) {
        negativeScore += intensityMultiplier;
      } else {
        positiveScore += intensityMultiplier;
      }
    }

    if (NEGATIVE_WORDS.has(word)) {
      if (isNegated) {
        positiveScore += intensityMultiplier * 0.5; // "not sad" is mildly positive
      } else {
        negativeScore += intensityMultiplier;
      }
    }

    intensityMultiplier = 1;
  }

  const total = positiveScore + negativeScore;
  const sentiment = total === 0 ? 0 : (positiveScore - negativeScore) / total;

  // Mood keywords — most frequent sentiment words
  const moodKeywords: string[] = [];
  for (const word of words) {
    if (POSITIVE_WORDS.has(word) || NEGATIVE_WORDS.has(word)) {
      if (!moodKeywords.includes(word)) {
        moodKeywords.push(word);
      }
    }
    if (moodKeywords.length >= 10) break;
  }

  // Vibe hints
  const vibeHints: string[] = [];
  for (const combo of VIBE_COMBOS) {
    const matchCount = combo.keywords.filter(kw => lowerLyrics.includes(kw)).length;
    if (matchCount >= combo.minMatches) {
      vibeHints.push(combo.vibe);
    }
  }

  return { themes, sentiment, mood_keywords: moodKeywords, vibe_hints: vibeHints };
}
