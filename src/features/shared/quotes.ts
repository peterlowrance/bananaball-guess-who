// Mascot quote bank. Split (the guide banana) and friends have plenty to say —
// on-theme, goofy, Banana-Ball-flavored lines for the moments where the mascot
// speaks. Pure data + a deterministic picker (no Math.random, matching the
// engine convention) so a given moment+seed is reproducible in tests.

export type QuoteMoment =
  | 'welcome' // onboarding splash
  | 'onboarding-correct' // nailed the taste-test question
  | 'onboarding-wrong' // missed the taste-test question
  | 'lesson-perfect' // finished a lesson with no misses
  | 'lesson-great' // finished a lesson, high accuracy
  | 'lesson-okay' // finished a lesson, lower accuracy
  | 'quiz-passed' // passed a unit quiz
  | 'quiz-failed' // did not pass a unit quiz
  | 'answer-correct' // small in-lesson praise
  | 'answer-wrong' // small in-lesson encouragement
  | 'combo' // hit a hot streak of correct answers
  | 'level-up' // crossed an XP level
  | 'streak-kept' // extended a daily streak
  | 'all-caught-up' // no reviews due
  | 'idle-tip'; // generic tip / filler

/** Every line is short enough to fit a speech bubble on a phone. */
const QUOTES: Record<QuoteMoment, string[]> = {
  welcome: [
    "Hi, I'm Split! Let's learn every Banana Ball player together. 🍌",
    "Peel out — it's time to meet the whole league!",
    "Welcome to the ballpark! I'll be your guide. Ready to go bananas?",
    "158 players. One goofy banana. Let's do this!",
  ],
  'onboarding-correct': [
    "Bam! You're a natural. This is gonna be a-peeling.",
    "Nailed it on the first pitch! 🎉",
    "See? You already know one. Only 157 to go!",
    "That's the spirit — you're built for this.",
  ],
  'onboarding-wrong': [
    "No worries — that's why we're here. You'll know them all soon!",
    "Everybody whiffs their first pitch. Let's warm up together. 🍌",
    "Close! Stick with me and these faces will click.",
    "Don't sweat it — learning is the whole game.",
  ],
  'lesson-perfect': [
    "FLAWLESS! You didn't miss a single one. I'm not crying, you're crying. 🔥",
    "Perfect lesson! Somebody get this fan a golden banana!",
    "Not one miss?! Are you secretly a scout?",
    "Immaculate. The crowd goes bananas! 🍌🍌🍌",
    "Zero misses. You're playing on a different level.",
  ],
  'lesson-great': [
    "Great reps! You're really getting to know the roster.",
    "Look at you go — those faces are sticking!",
    "Solid lesson. The bench is impressed.",
    "You're rounding the bases on this roster. Keep it up!",
    "Nice work out there, slugger.",
  ],
  'lesson-okay': [
    "Every rep counts. You'll know them all soon! 🍌",
    "That's how we learn — a few misses, a lot of progress.",
    "Shake it off. Tomorrow's faces will be easier.",
    "Rome wasn't scouted in a day. Keep swinging!",
    "Good hustle. The tricky ones just take a few more looks.",
  ],
  'quiz-passed': [
    "Quiz passed! You've earned your spot in the dugout. 🏆",
    "Boom — unit cleared! On to the next batch of faces.",
    "You passed! The scouting report says: promising.",
    "That's a wrap on this unit. Beautiful work.",
  ],
  'quiz-failed': [
    "So close! Take another crack — the questions change every time.",
    "Not quite, but no penalty here. Run it back!",
    "The tough ones tripped you up. Let's review and retry.",
    "One more try — I believe in you. 🍌",
  ],
  'answer-correct': [
    'Yes! 🍌',
    "That's the one!",
    "Boom.",
    "You got it!",
    "Textbook.",
    "Easy peasy.",
  ],
  'answer-wrong': [
    "Ope — not that one.",
    "Close! Take a good look.",
    "We'll get 'em next time.",
    "No sweat, keep going.",
    "Almost! Remember this face.",
  ],
  combo: [
    "🔥 You're on FIRE!",
    "Combo! Don't stop now!",
    "Unstoppable! The crowd is on their feet!",
    "Hot streak! 🍌🔥",
    "Somebody call the bullpen — you're cooking!",
  ],
  'level-up': [
    "LEVEL UP! You've climbed the roster ranks. 🎉",
    "New title unlocked — you're moving up in the league!",
    "Ding! That's a promotion, superstar.",
    "Look at you, climbing the lineup card!",
  ],
  'streak-kept': [
    "Streak extended! Consistency is the secret sauce. 🔥",
    "Another day in the books — keep that flame alive!",
    "You showed up. That's how legends are made.",
    "Daily goal smashed. See you tomorrow, right?",
  ],
  'all-caught-up': [
    "All caught up — nothing due! Take a bow. 🎉",
    "Reviews cleared! Your memory's in midseason form.",
    "Nothing to review right now. You've earned a breather.",
    "Inbox zero, banana style. 🍌",
  ],
  'idle-tip': [
    "Tip: the more you review, the longer the faces stick.",
    "Psst — you can focus on just your favorite teams in Settings.",
    "Fun fact: I'm technically a banana in a baseball uniform.",
    "A little practice every day beats cramming. Trust me.",
    "The Roster page tracks every player you've met.",
  ],
};

/** FNV-1a 32-bit hash → a stable non-negative index source (no Math.random). */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick a quote for a moment. Deterministic given (moment, seed): pass a varying
 * seed (e.g. a lesson id, attempt count, or XP total) to rotate lines. Omitting
 * the seed returns the first line, which keeps it testable.
 */
export function mascotQuote(moment: QuoteMoment, seed: string | number = 0): string {
  const lines = QUOTES[moment];
  if (!lines || lines.length === 0) return '';
  const idx = hash(moment + '|' + String(seed)) % lines.length;
  return lines[idx];
}

export { QUOTES };
