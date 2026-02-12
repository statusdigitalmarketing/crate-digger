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

// Words organized by intensity: strong = 1.5x, medium = 1.0x, mild = 0.5x

const STRONG_POSITIVE: string[] = [
  'ecstatic', 'euphoric', 'glorious', 'triumphant', 'paradise', 'legendary',
  'magnificent', 'extraordinary', 'phenomenal', 'spectacular', 'exhilarating',
  'transcendent', 'heavenly', 'rapturous', 'breathtaking', 'electrifying',
  'unstoppable', 'invincible', 'victorious', 'sensational', 'miraculous',
  'nirvana', 'blissful', 'sublime', 'majestic', 'almighty',
  'revolutionary', 'divine', 'incredible', 'unbelievable', 'fantastic',
  'marvelous', 'thrilling', 'glowing', 'radiant', 'dazzling', 'stunning',
  'gorgeous', 'superb', 'brilliant', 'exquisite', 'flawless',
  'immaculate', 'supreme', 'ultimate', 'epic', 'iconic', 'godly',
  'transcendental', 'otherworldly', 'enchanting', 'spellbinding',
  'mesmerizing', 'captivating', 'intoxicating', 'irresistible', 'blazing',
  'soaring', 'ascending', 'reigning', 'crowned', 'anointed',
  'sanctified', 'glorified', 'exalted', 'elevated', 'empowered', 'liberated',
  'reborn', 'awakened', 'enlightened', 'infinite', 'eternal', 'immortal',
  'celestial', 'heroic', 'courageous', 'fearless', 'dauntless', 'bold',
];

const MEDIUM_POSITIVE: string[] = [
  'happy', 'joy', 'love', 'beautiful', 'amazing', 'wonderful', 'great', 'good',
  'smile', 'laugh', 'sunshine', 'bright', 'light', 'hope', 'dream', 'perfect',
  'best', 'glory', 'bliss', 'alive', 'free', 'peace', 'warm', 'fun',
  'celebrate', 'sweet', 'golden', 'magic', 'proud', 'delight', 'grateful',
  'thankful', 'cheerful', 'excited', 'thrilled', 'inspired', 'confident',
  'strong', 'brave', 'shining', 'sparkling', 'colorful', 'vibrant',
  'passionate', 'tender', 'loving', 'caring', 'devoted', 'loyal', 'faithful',
  'genuine', 'authentic', 'precious', 'treasure', 'charm', 'grace', 'elegant',
  'fancy', 'lively', 'playful', 'joyful', 'merry', 'festive', 'upbeat',
  'positive', 'optimistic', 'hopeful', 'promising', 'lucky', 'fortunate',
  'abundance', 'prosperity', 'success', 'winning', 'champion',
  'victory', 'achieve', 'accomplish', 'overcome', 'triumph', 'conquer',
  'thrive', 'flourish', 'bloom', 'blossom', 'grow', 'heal', 'recover',
  'refresh', 'rejuvenate', 'restore', 'revive', 'renew', 'transform',
  'evolve', 'elevate', 'uplift', 'empower', 'encourage', 'support',
  'together', 'united', 'connected', 'bonded', 'hugging', 'kissing',
  'dancing', 'singing', 'flying', 'rising', 'climbing',
  'adventure', 'explore', 'discover', 'wonder', 'miracle', 'destiny',
  'purpose', 'meaning', 'fulfillment', 'satisfaction', 'contentment',
  'serenity', 'harmony', 'balance', 'clarity', 'wisdom', 'truth',
  'freedom', 'liberation', 'release', 'relief', 'comfort', 'shelter',
  'protect', 'embrace', 'welcome', 'belong', 'home', 'family',
  'friendship', 'loyalty', 'trust', 'faith', 'believe', 'courage',
  'blessed',
];

const MILD_POSITIVE: string[] = [
  'nice', 'fine', 'okay', 'decent', 'pleasant', 'gentle', 'calm',
  'cool', 'chill', 'relaxed', 'easy', 'simple', 'clean', 'clear',
  'fair', 'kind', 'soft', 'smooth', 'steady', 'stable', 'secure',
  'safe', 'cozy', 'snug', 'neat', 'tidy', 'fresh', 'crisp',
  'modest', 'humble', 'quiet', 'peaceful', 'tranquil', 'serene',
  'mellow', 'easygoing', 'casual', 'comfortable',
  'adequate', 'sufficient', 'reasonable', 'acceptable', 'satisfactory',
  'alright', 'passable', 'tolerable', 'manageable', 'workable',
  'functional', 'practical', 'useful', 'helpful', 'handy', 'convenient',
  'aight', 'straight', 'solid', 'tight', 'dope',
  'groovy', 'swell', 'peachy', 'dandy', 'nifty', 'keen',
];

const STRONG_NEGATIVE: string[] = [
  'devastated', 'agonizing', 'tormented', 'annihilated', 'excruciating',
  'catastrophic', 'apocalyptic', 'horrifying', 'nightmarish', 'atrocious',
  'abominable', 'despicable', 'vile', 'wretched', 'abysmal', 'treacherous',
  'diabolical', 'demonic', 'satanic', 'hellish', 'infernal', 'murderous',
  'sadistic', 'deranged',
  'desolate', 'obliterated', 'decimated', 'ravaged', 'gutted', 'shattered',
  'pulverized', 'crushed', 'mangled', 'mutilated', 'butchered', 'slaughtered',
  'massacred', 'tortured', 'crucified', 'damned', 'cursed', 'forsaken',
  'abandoned', 'betrayed', 'stabbed', 'poisoned', 'corrupted', 'infected',
  'contaminated', 'diseased', 'plagued', 'ruined', 'wrecked',
  'demolished', 'eradicated', 'exterminated', 'eliminated',
  'abolished', 'condemned', 'doomed',
  'deplorable', 'repulsive', 'disgusting', 'revolting', 'nauseating',
  'sickening', 'appalling', 'dreadful', 'terrible', 'horrible', 'awful',
];

const MEDIUM_NEGATIVE: string[] = [
  'sad', 'pain', 'hurt', 'cry', 'dark', 'death', 'hate', 'fear', 'alone',
  'broken', 'lost', 'empty', 'cold', 'dead', 'suffer', 'misery', 'doom',
  'hell', 'evil', 'blood', 'scream', 'burn', 'destroy', 'fall', 'drown',
  'nightmare', 'rage', 'sorrow', 'despair', 'agony', 'torment', 'wicked',
  'angry', 'furious', 'bitter', 'jealous', 'envious', 'resentful', 'hostile',
  'violent', 'brutal', 'savage', 'cruel', 'harsh', 'ruthless', 'merciless',
  'heartless', 'soulless', 'lifeless', 'joyless', 'loveless',
  'hopeless', 'helpless', 'powerless', 'defenseless', 'vulnerable', 'exposed',
  'trapped', 'caged', 'chained', 'bound', 'enslaved', 'oppressed', 'silenced',
  'ignored', 'rejected', 'forgotten', 'discarded', 'replaced',
  'unwanted', 'unloved', 'unworthy', 'ashamed', 'guilty', 'regret',
  'remorse', 'mourn', 'grieve', 'weep', 'sob', 'wail', 'lament',
  'bleed', 'wound', 'scar', 'bruise', 'fracture', 'crack', 'crumble',
  'decay', 'rot', 'wither', 'fade', 'vanish', 'disappear', 'dissolve',
  'collapse', 'shatter', 'erode', 'corrode', 'tarnish',
  'stain', 'taint', 'corrupt', 'poison', 'toxic', 'venomous', 'lethal',
  'fatal', 'deadly', 'killing', 'murder', 'slaughter', 'sacrifice',
  'punish', 'condemn', 'curse', 'haunt', 'stalk', 'prey', 'devour',
  'consume', 'drain', 'exhaust', 'deplete', 'starve', 'thirst', 'hunger',
  'pathetic', 'pitiful', 'miserable', 'worthless', 'useless', 'meaningless', 'pointless',
];

const MILD_NEGATIVE: string[] = [
  'bored', 'tired', 'meh', 'down', 'blue', 'off', 'rough',
  'dull', 'bland', 'flat', 'stale', 'boring', 'tedious', 'monotonous',
  'gray', 'dim', 'faded', 'worn', 'weary', 'fatigued', 'drained',
  'sluggish', 'lazy', 'slow', 'heavy', 'dragging', 'listless', 'lethargic',
  'uneasy', 'uncomfortable', 'awkward', 'clumsy', 'foolish', 'silly',
  'confused', 'puzzled', 'uncertain', 'unsure', 'hesitant', 'doubtful',
  'skeptical', 'suspicious', 'wary', 'cautious', 'nervous', 'tense',
  'stressed', 'strained', 'pressured', 'overwhelmed', 'frustrated',
  'annoyed', 'irritated', 'bothered', 'bugged', 'irked', 'peeved',
  'grumpy', 'cranky', 'moody', 'sulky', 'pouty', 'whiny', 'needy',
  'clingy', 'insecure', 'anxious', 'worried', 'concerned', 'troubled',
  'restless', 'impatient', 'agitated', 'fidgety', 'jittery', 'edgy',
];

function buildWeightedMap(strong: string[], medium: string[], mild: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of strong) map.set(w, 1.5);
  for (const w of medium) map.set(w, 1.0);
  for (const w of mild) map.set(w, 0.5);
  return map;
}

const POSITIVE_WORD_WEIGHTS = buildWeightedMap(STRONG_POSITIVE, MEDIUM_POSITIVE, MILD_POSITIVE);
const NEGATIVE_WORD_WEIGHTS = buildWeightedMap(STRONG_NEGATIVE, MEDIUM_NEGATIVE, MILD_NEGATIVE);

const POSITIVE_WORDS = new Set(POSITIVE_WORD_WEIGHTS.keys());
const NEGATIVE_WORDS = new Set(NEGATIVE_WORD_WEIGHTS.keys());

const SLANG_SENTIMENT = new Map<string, number>([
  ['bussin', 0.7], ['valid', 0.3], ['slay', 0.6], ['fire', 0.5],
  ['goated', 0.8], ['vibing', 0.5], ['slaps', 0.6], ['bop', 0.5],
  ['ate', 0.6], ['iconic', 0.7], ['purr', 0.4],
  ['serve', 0.5], ['snapped', 0.6], ['devoured', 0.5], ['periodt', 0.5],
  ['yasss', 0.7], ['goat', 0.7],
  ['legend', 0.6], ['fye', 0.5], ['heat', 0.4], ['certified', 0.5],
  ['banger', 0.6], ['hits', 0.4], ['elite', 0.5],
  ['based', 0.4], ['clutch', 0.5], ['mint', 0.3],
  ['lowkey', 0.1], ['highkey', 0.3],
  ['bet', 0.3], ['vibe', 0.4],
  ['mood', 0.2], ['flex', 0.4], ['drip', 0.4], ['swag', 0.4],
  ['wavy', 0.4], ['drippy', 0.4],
  ['mid', -0.3], ['cap', -0.2], ['sus', -0.3],
  ['ghosted', -0.5], ['ratio', -0.4], ['cringe', -0.5],
  ['ick', -0.5], ['flop', -0.5], ['cancelled', -0.4],
  ['clown', -0.4], ['clowned', -0.5],
  ['trash', -0.6], ['washed', -0.4],
  ['rip', -0.3], ['yikes', -0.4], ['oof', -0.3], ['nah', -0.2],
  ['basic', -0.3], ['corny', -0.4], ['lame', -0.4],
  ['bogus', -0.4], ['trippin', -0.3], ['buggin', -0.3], ['wildin', -0.2],
  ['tweaking', -0.3], ['pressed', -0.3], ['salty', -0.3], ['petty', -0.3],
  ['shady', -0.4], ['fake', -0.5], ['phony', -0.4], ['snake', -0.5],
  ['simp', -0.3], ['thirsty', -0.3], ['desperate', -0.5],
]);

const MULTI_WORD_SLANG = new Map<string, number>([
  ['down bad', -0.7], ['no cap', 0.3], ['caught in 4k', -0.3],
  ["ain't it", -0.3], ["chef's kiss", 0.6],
]);

const EMOJI_SENTIMENT = new Map<string, number>([
  ['\u2764\uFE0F', 0.5], ['\uD83D\uDC95', 0.5], ['\uD83D\uDC96', 0.5],
  ['\uD83D\uDC97', 0.5], ['\uD83D\uDC98', 0.4], ['\uD83D\uDC9D', 0.5],
  ['\uD83D\uDC9E', 0.4], ['\uD83D\uDC93', 0.4], ['\uD83D\uDE0D', 0.6],
  ['\uD83E\uDD70', 0.6], ['\uD83D\uDE18', 0.5], ['\uD83D\uDE0A', 0.4],
  ['\uD83D\uDE04', 0.5], ['\uD83D\uDE03', 0.5], ['\uD83D\uDE01', 0.5],
  ['\uD83E\uDD29', 0.6], ['\uD83E\uDD73', 0.6], ['\uD83C\uDF89', 0.5],
  ['\uD83C\uDF8A', 0.5], ['\u2728', 0.4], ['\uD83C\uDF1F', 0.4],
  ['\u2B50', 0.3], ['\uD83D\uDCAF', 0.5], ['\uD83D\uDC51', 0.5],
  ['\uD83C\uDFC6', 0.5], ['\uD83D\uDD25', 0.4], ['\uD83D\uDCAA', 0.4],
  ['\uD83D\uDC4F', 0.4], ['\uD83D\uDE4C', 0.5], ['\uD83E\uDD18', 0.4],
  ['\u270C\uFE0F', 0.3], ['\uD83C\uDF08', 0.4], ['\u2600\uFE0F', 0.4],
  ['\uD83C\uDF05', 0.3], ['\uD83C\uDF38', 0.3], ['\uD83C\uDF3A', 0.3],
  ['\uD83E\uDD8B', 0.3], ['\uD83D\uDC90', 0.3], ['\uD83C\uDF3B', 0.3],
  ['\uD83C\uDFB6', 0.3], ['\uD83C\uDFB5', 0.3], ['\uD83C\uDFA4', 0.2],
  ['\uD83D\uDC83', 0.4], ['\uD83D\uDD7A', 0.4], ['\uD83D\uDE0E', 0.3],
  ['\uD83E\uDD17', 0.4], ['\uD83D\uDE07', 0.4],
  // Negative
  ['\uD83D\uDE22', -0.5], ['\uD83D\uDE2D', -0.6], ['\uD83D\uDE3F', -0.4],
  ['\uD83D\uDC94', -0.6], ['\uD83D\uDE1E', -0.4], ['\uD83D\uDE14', -0.4],
  ['\uD83D\uDE1F', -0.4], ['\uD83E\uDD7A', -0.3], ['\uD83D\uDE29', -0.4],
  ['\uD83D\uDE2B', -0.4], ['\uD83D\uDE24', -0.4], ['\uD83D\uDE21', -0.6],
  ['\uD83E\uDD2C', -0.7], ['\uD83D\uDC7F', -0.5], ['\uD83D\uDE08', -0.2],
  ['\uD83D\uDC80', -0.1], ['\u2620\uFE0F', -0.3], ['\uD83D\uDC7B', -0.1],
  ['\uD83D\uDE31', -0.5], ['\uD83D\uDE30', -0.4], ['\uD83D\uDE28', -0.4],
  ['\uD83D\uDE25', -0.4], ['\uD83D\uDE13', -0.3], ['\uD83E\uDD2E', -0.5],
  ['\uD83E\uDD22', -0.4], ['\uD83D\uDE35', -0.4], ['\uD83D\uDE11', -0.2],
  ['\uD83D\uDE10', -0.1], ['\uD83D\uDE44', -0.3], ['\uD83D\uDE12', -0.3],
  ['\uD83D\uDE0F', -0.1], ['\uD83D\uDDA4', -0.1],
]);

const INTENSITY_MODIFIERS = new Set([
  'very', 'so', 'really', 'fucking', 'damn', 'extremely', 'absolutely',
  'completely', 'totally', 'deeply', 'truly', 'incredibly',
]);

const NEGATION_WORDS = new Set([
  'not', 'no', "don't", "doesn't", "didn't", "won't", "can't", "couldn't",
  "wouldn't", "shouldn't", 'never', 'nothing', 'nobody', 'nowhere', "isn't", "aren't",
]);

export const VIBE_COMBOS: Array<{ keywords: string[]; vibe: string; minMatches: number }> = [
  // Hip-Hop/Rap
  { keywords: ['trap', 'dark', 'gun', 'gang', 'drip', 'street', 'opps'], vibe: 'dark trap', minMatches: 2 },
  { keywords: ['melody', 'sing', 'auto-tune', 'autotune', 'feelings', 'vibe', 'soul'], vibe: 'melodic rap', minMatches: 2 },
  { keywords: ['drill', 'slide', 'spin', 'block', 'strip', 'gang', 'lacking'], vibe: 'drill', minMatches: 2 },
  { keywords: ['conscious', 'woke', 'system', 'justice', 'truth', 'knowledge', 'people', 'society'], vibe: 'conscious hip-hop', minMatches: 2 },
  { keywords: ['boom', 'bap', 'sample', 'vinyl', 'mic', 'lyrical', 'bars', 'flow'], vibe: 'boom bap', minMatches: 2 },
  { keywords: ['rage', 'scream', 'destroy', 'chaos', 'punk', 'mosh'], vibe: 'rage rap', minMatches: 2 },
  { keywords: ['phonk', 'drift', 'cowbell', 'memphis', 'bass', 'dark', 'trunk'], vibe: 'phonk', minMatches: 2 },
  { keywords: ['slow', 'chopped', 'screwed', 'syrup', 'lean', 'purple', 'slowed'], vibe: 'chopped and screwed', minMatches: 2 },
  { keywords: ['trap', 'soul', 'sing', 'heart', 'feel', 'pain', 'love'], vibe: 'trap soul', minMatches: 2 },
  { keywords: ['mumble', 'adlib', 'yeah', 'skrt', 'drip', 'sauce', 'ice'], vibe: 'mumble rap', minMatches: 2 },

  // Electronic
  { keywords: ['deep', 'house', 'groove', 'bass', 'underground', 'minimal', 'pulse'], vibe: 'deep house', minMatches: 2 },
  { keywords: ['tech', 'house', 'warehouse', 'loop', 'minimal', 'groove'], vibe: 'tech house', minMatches: 2 },
  { keywords: ['progressive', 'build', 'breakdown', 'euphoric', 'journey', 'trance'], vibe: 'progressive house', minMatches: 2 },
  { keywords: ['drum', 'bass', 'jungle', 'breakbeat', 'amen', 'liquid', 'neurofunk'], vibe: 'drum and bass', minMatches: 2 },
  { keywords: ['dubstep', 'wobble', 'filthy', 'drop', 'bass', 'wub', 'heavy'], vibe: 'dubstep', minMatches: 2 },
  { keywords: ['future', 'bass', 'ethereal', 'wonky', 'synth', 'shimmer', 'lush'], vibe: 'future bass', minMatches: 2 },
  { keywords: ['lo-fi', 'lofi', 'chill', 'study', 'rain', 'tape', 'vinyl', 'hiss'], vibe: 'lo-fi beats', minMatches: 2 },
  { keywords: ['synth', 'retro', 'neon', '80s', 'drive', 'outrun', 'cyber'], vibe: 'synthwave', minMatches: 2 },
  { keywords: ['hardstyle', 'kick', 'reverse', 'euphoric', 'hard', 'rave', 'gabber'], vibe: 'hardstyle', minMatches: 2 },
  { keywords: ['ambient', 'drone', 'texture', 'atmospheric', 'pad', 'space', 'float'], vibe: 'ambient techno', minMatches: 2 },
  { keywords: ['brazilian', 'phonk', 'funk', 'baile', 'favela', 'eletro', 'grave'], vibe: 'Brazilian phonk', minMatches: 2 },

  // Rock/Metal
  { keywords: ['post-punk', 'goth', 'angular', 'cold', 'new wave', 'bleak', 'stark'], vibe: 'post-punk', minMatches: 2 },
  { keywords: ['shoegaze', 'reverb', 'noise', 'dreamy', 'wall', 'blur', 'swirl'], vibe: 'shoegaze', minMatches: 2 },
  { keywords: ['grunge', 'flannel', 'angst', 'distortion', 'seattle', 'dirty', 'raw'], vibe: 'grunge', minMatches: 2 },
  { keywords: ['metalcore', 'breakdown', 'scream', 'mosh', 'heavy', 'core', 'pit'], vibe: 'metalcore', minMatches: 2 },
  { keywords: ['doom', 'slow', 'heavy', 'sludge', 'riff', 'crushing', 'monolithic'], vibe: 'doom metal', minMatches: 2 },
  { keywords: ['psychedelic', 'acid', 'trip', 'kaleidoscope', 'mind', 'expand', 'cosmic'], vibe: 'psychedelic rock', minMatches: 2 },
  { keywords: ['math', 'odd', 'time', 'angular', 'complex', 'polyrhythm', 'technical'], vibe: 'math rock', minMatches: 2 },
  { keywords: ['emo', 'diary', 'confession', 'tears', 'feelings', 'screamo', 'emotional'], vibe: 'emo', minMatches: 2 },
  { keywords: ['pop punk', 'suburban', 'summer', 'fast', 'anthem', 'youth', 'skate'], vibe: 'pop punk', minMatches: 2 },
  { keywords: ['stoner', 'haze', 'fuzz', 'weed', 'heavy', 'groove', 'riff'], vibe: 'stoner rock', minMatches: 2 },

  // Pop/R&B
  { keywords: ['bedroom', 'intimate', 'soft', 'whisper', 'lo-fi', 'homemade', 'gentle'], vibe: 'bedroom pop', minMatches: 2 },
  { keywords: ['dream', 'ethereal', 'hazy', 'shimmer', 'soft', 'float', 'glow'], vibe: 'dream pop', minMatches: 2 },
  { keywords: ['dark', 'pop', 'moody', 'shadow', 'brooding', 'sleek', 'noir'], vibe: 'dark pop', minMatches: 2 },
  { keywords: ['hyper', 'glitch', 'distort', 'maximalist', 'digital', 'chaos', 'pitch'], vibe: 'hyperpop', minMatches: 2 },
  { keywords: ['neo', 'soul', 'groove', 'organic', 'jazzy', 'smooth', 'warm'], vibe: 'neo-soul', minMatches: 2 },
  { keywords: ['alternative', 'r&b', 'moody', 'experimental', 'atmospheric', 'sultry'], vibe: 'alternative R&B', minMatches: 2 },
  { keywords: ['sad', 'girl', 'indie', 'melancholy', 'acoustic', 'confessional', 'diary'], vibe: 'sad girl indie', minMatches: 2 },
  { keywords: ['folk', 'acoustic', 'campfire', 'banjo', 'harmonica', 'storytelling', 'nature'], vibe: 'indie folk', minMatches: 2 },
  { keywords: ['chamber', 'strings', 'orchestra', 'lush', 'arrangement', 'baroque', 'cinematic'], vibe: 'chamber pop', minMatches: 2 },

  // Country/Americana
  { keywords: ['truck', 'beer', 'girl', 'road', 'country', 'dirt', 'boots'], vibe: 'drinking country', minMatches: 2 },
  { keywords: ['heartbreak', 'whiskey', 'tears', 'gone', 'leaving', 'country', 'porch'], vibe: 'heartbreak country', minMatches: 2 },
  { keywords: ['outlaw', 'rebel', 'highway', 'trouble', 'prison', 'rambling', 'dust'], vibe: 'outlaw country', minMatches: 2 },
  { keywords: ['tailgate', 'party', 'summer', 'lake', 'bro', 'country', 'town'], vibe: 'bro-country', minMatches: 2 },
  { keywords: ['americana', 'roots', 'folk', 'heartland', 'honest', 'working', 'land'], vibe: 'Americana folk', minMatches: 2 },
  { keywords: ['country', 'rock', 'electric', 'southern', 'twang', 'guitar', 'rowdy'], vibe: 'country rock', minMatches: 2 },
  { keywords: ['bluegrass', 'banjo', 'fiddle', 'mandolin', 'pickin', 'mountain', 'holler'], vibe: 'bluegrass', minMatches: 2 },

  // Latin/Caribbean
  { keywords: ['reggaeton', 'perreo', 'dembow', 'booty', 'gasolina', 'dale', 'fuego'], vibe: 'reggaeton', minMatches: 2 },
  { keywords: ['latin', 'trap', 'calle', 'barrio', 'latino', 'hood', 'glock'], vibe: 'Latin trap', minMatches: 2 },
  { keywords: ['bachata', 'romance', 'merengue', 'dominican', 'bailar', 'corazon', 'amor'], vibe: 'bachata', minMatches: 2 },
  { keywords: ['dancehall', 'riddim', 'bashment', 'wine', 'dutty', 'yard', 'jamaican'], vibe: 'dancehall', minMatches: 2 },
  { keywords: ['afrobeat', 'african', 'jollof', 'lagos', 'naija', 'highlife', 'afro'], vibe: 'Afrobeats', minMatches: 2 },
  { keywords: ['bossa', 'nova', 'brazilian', 'samba', 'rio', 'tropical', 'smooth'], vibe: 'bossa nova', minMatches: 2 },

  // Other
  { keywords: ['lo-fi', 'lofi', 'hip-hop', 'study', 'beats', 'chill', 'relax'], vibe: 'lo-fi hip-hop', minMatches: 2 },
  { keywords: ['vaporwave', 'aesthetic', 'mall', 'retro', 'consume', 'plaza', 'vapor'], vibe: 'vaporwave', minMatches: 2 },
  { keywords: ['chillwave', 'hazy', 'summer', 'nostalgia', 'dreamy', 'sun', 'glo'], vibe: 'chillwave', minMatches: 2 },
  { keywords: ['city', 'pop', 'japanese', 'tokyo', '80s', 'neon', 'funk', 'boogie'], vibe: 'city pop', minMatches: 2 },
  { keywords: ['jazz', 'fusion', 'improvise', 'sax', 'trumpet', 'swing', 'bebop'], vibe: 'jazz fusion', minMatches: 2 },
  { keywords: ['pray', 'god', 'church', 'faith', 'worship', 'gospel'], vibe: 'gospel soul', minMatches: 2 },
  { keywords: ['bollywood', 'desi', 'hindi', 'bhangra', 'masala', 'filmi', 'india'], vibe: 'Bollywood pop', minMatches: 2 },

  // Preserved V1 combos
  { keywords: ['bass', 'drop', 'rave', 'dance', 'beat', 'club'], vibe: 'club banger', minMatches: 2 },
  { keywords: ['love', 'heart', 'slow', 'soft', 'gentle', 'hold'], vibe: 'love ballad', minMatches: 2 },
  { keywords: ['grind', 'hustle', 'money', 'stack', 'work', 'paper'], vibe: 'hustle anthem', minMatches: 2 },
  { keywords: ['space', 'stars', 'float', 'dream', 'cosmos', 'galaxy'], vibe: 'cosmic', minMatches: 2 },
  { keywords: ['ocean', 'wave', 'beach', 'surf', 'island', 'tropical'], vibe: 'tropical chill', minMatches: 2 },
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

  // Sentiment scoring with negation, intensity, and weighted words
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

    const posWeight = POSITIVE_WORD_WEIGHTS.get(word);
    if (posWeight !== undefined) {
      const score = intensityMultiplier * posWeight;
      if (isNegated) {
        negativeScore += score;
      } else {
        positiveScore += score;
      }
    }

    const negWeight = NEGATIVE_WORD_WEIGHTS.get(word);
    if (negWeight !== undefined) {
      const score = intensityMultiplier * negWeight;
      if (isNegated) {
        positiveScore += score * 0.5; // "not sad" is mildly positive
      } else {
        negativeScore += score;
      }
    }

    // Slang sentiment (only if not already counted)
    if (posWeight === undefined && negWeight === undefined) {
      const slangScore = SLANG_SENTIMENT.get(word);
      if (slangScore !== undefined) {
        if (slangScore > 0) {
          positiveScore += slangScore * intensityMultiplier;
        } else {
          negativeScore += Math.abs(slangScore) * intensityMultiplier;
        }
      }
    }

    intensityMultiplier = 1;
  }

  // Multi-word slang
  for (const [slang, score] of MULTI_WORD_SLANG) {
    if (lowerLyrics.includes(slang)) {
      if (score > 0) {
        positiveScore += score;
      } else {
        negativeScore += Math.abs(score);
      }
    }
  }

  // Emoji sentiment
  for (const [emoji, score] of EMOJI_SENTIMENT) {
    if (lyrics.includes(emoji)) {
      const count = Math.min((lyrics.split(emoji).length - 1), 5);
      if (score > 0) {
        positiveScore += score * count;
      } else {
        negativeScore += Math.abs(score) * count;
      }
    }
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
