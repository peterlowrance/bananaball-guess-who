// Author the themed curriculum. DESIGN DECISIONS (theme, order, motif, which
// players) are made here by hand; the script just resolves selections to ids,
// guarantees every player lands in exactly one unit, and emits units-2026.json.
import { readFileSync, writeFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('./src/data/players-2026.json', 'utf8'));
const P = d.players;
const teamSlug = (name) => {
  const t = d.teams.find((t) => t.name === name);
  return t ? t.slug.replace(/-[0-9a-f]{8}$/, '') : '';
};
const fam = (l) => {
  l = l.toLowerCase();
  if (l.includes('relief')) return 'RP';
  if (l.includes('starting pitcher')) return 'SP';
  if (l.includes('pitcher')) return 'P';
  if (l.includes('catcher')) return 'C';
  if (l.includes('field') || l === 'outfield') return 'OF';
  if (l.includes('baseman') || l.includes('shortstop')) return 'IF';
  if (l.includes('two-way')) return '2W';
  if (l.includes('runner')) return 'DR';
  if (l.includes('hitter')) return 'DH';
  return 'X';
};
const pop = (p) => p.popularity_rank ?? 999;
const byPop = (a, b) => pop(a) - pop(b) || a.name.localeCompare(b.name);
const idOf = (name) => {
  const p = P.find((x) => x.name === name);
  if (!p) throw new Error(`author-units: no player named "${name}"`);
  return p.player_id;
};
const byId = (id) => P.find((p) => p.player_id === id);

// Claim-tracking: each player can be OWNED exactly once. Cameos don't claim —
// a cameo is a player owned elsewhere, replayed here as themed review.
const claimed = new Set();
const units = [];
/** take(n, predicate, sort?) → up to n still-unclaimed players matching pred */
function take(n, pred, sort = byPop) {
  const picks = P.filter((p) => !claimed.has(p.player_id) && pred(p)).sort(sort).slice(0, n);
  picks.forEach((p) => claimed.add(p.player_id));
  return picks;
}
function takeAll(pred, sort = byPop) {
  return take(Infinity, pred, sort);
}
function unit(slug, title, theme, motif, act, players, cameo = []) {
  units.push({ slug, title, theme, motif, act, owned: players.map((p) => p.player_id), cameo });
}
const team = (t) => (p) => p.team_name === t;

// Reserve specific players (by name) as OWNED by an upcoming unit, so the
// team/position passes below don't grab them first. Used to give a personality
// unit a real home roster.
function reserve(names) {
  const ids = names.map(idOf);
  ids.forEach((id) => claimed.delete(id)); // ensure unclaimed
  const picks = ids.map(byId);
  ids.forEach((id) => claimed.add(id));
  return picks;
}

// A cameo list: players owned by an EARLIER unit, pulled in as themed review.
// The validator enforces "owned earlier" and "not owned here", so cameo() just
// resolves names → ids; ordering of units guarantees the back-reference.
const cameos = (names) => names.map(idOf);

const num = (s) => parseFloat(String(s ?? '').replace(/^\./, '0.')) || 0;

// A PERFORMANCE unit: a stat leaderboard. Its OWNED core is reserved up front
// (players whose identity IS that stat and who aren't top-9 team stars); the
// rest of the leaderboard's leaders come in as CAMEOS so the ranking reads
// complete — "keep the theme, cameo whoever's taken." `ownedNames` is reserved
// before the team/position passes so those don't claim the core first.
function performanceUnit(slug, title, theme, motif, ranked, limit, ownedNames) {
  const ownedSet = new Set(ownedNames.map(idOf));
  // Ids owned by units emitted SO FAR — the only valid cameo targets (a cameo
  // must back-reference an already-defined unit, never a later one).
  const alreadyOwned = new Set(units.flatMap((u) => u.owned));
  const cameo = [];
  for (const p of ranked.slice(0, limit)) {
    if (ownedSet.has(p.player_id)) continue; // owned here
    if (alreadyOwned.has(p.player_id)) cameo.push(p.player_id);
    // else: owned by a later unit (or its reserved core) — skip, no forward ref.
  }
  units.push({ slug, title, theme, motif, act: 3, owned: [...ownedSet], cameo });
  return ownedSet.size;
}

// ─── RESERVATIONS ──────────────────────────────────────────────────────────
// The "Showstoppers" personality unit (Act 3) needs a home roster. Reserve the
// entertainers who AREN'T top-9 team stars so the team/position passes don't
// claim them; the famous ones (RAC, KJ, Stilts, Olson) stay owned by their team
// and appear in Showstoppers as CAMEOS. Attributions verified via web research
// (Bananas roster + press): backflips, stilts, dance, viral showmen.
// Ben Parker (Coconuts OF) — "Backflip Catch Club", also rides a unicycle; his
// signature IS the trick, so he's owned here rather than in an outfield unit.
const showstopperOwned = reserve(['Alex Ziegler', 'Kyle Luigs', 'JT Sokolove', 'Ben Parker']);

// Owned cores for the data-driven performance units (Act 3). Reserved here so
// the team/position passes don't grab them; the rest of each leaderboard comes
// in as cameos. Chosen from the actual stat leaders, favoring players whose
// identity is that stat and who aren't already an Act-1 team headliner.
const PERF_OWNED = {
  sluggers: ['T.J. Reeves', 'Jordan Brewer', 'Taylor Justus'],
  coldStreak: ['Danny Hosley', 'Armando Becerra', 'Grady Morgan'],
  aces: ['Brian Trepanier', 'Nick Wilson', 'Trystan Levesque'],
  strikeoutKings: ['Austin Drury', 'Bradford Webb', 'Jared Donalson'],
  battingPractice: ['Clark Gilmore', 'Zach Smith', 'Vinny Santarsiero'],
  trickPlay: ['Jonathan Luders', 'Jorden Hussein', 'Sal Jacobo'],
  butterfingers: ['Bobby Lada', 'Dane Tofteland', 'Peyton Chatagnier'],
  // Career-stat units (B4S / SB / WO). Cores chosen from the career leaders
  // who aren't already Act-1 team stars.
  sprinters: ['Jake Skole', 'Reece Hampton', 'Jason Swan'],
  baseBandits: ['Malachi Mitchell', 'DR Meadows', 'Bryson Bloomer'],
  walkOffs: ['Dan Oberst', 'Eric Jones Jr.', 'Reese Alexiades'],
  // Experience units — rookie vs veteran, inferred from career-vs-season games.
  freshFaces: ['Reese Miller', 'Joe Filomeno', 'Peter Holden'],
  oldGuard: ['Dustin Baber', 'Chase Achuff', 'Tanner Thomas'],
  fanFavorites: ['Noah Niznik', 'Bret Helton', 'Dalton Ponce'],
};
for (const names of Object.values(PERF_OWNED)) reserve(names);

// ─── ACT 1 — Meet the stars (single-team, team-color motifs) ───────────────
const A1 = [
  ['Savannah Bananas', 'banana-stars', 'Banana Stars', 'The flagship faces of the Savannah Bananas.'],
  ['Party Animals', 'party-starters', 'Party Starters', "The Party Animals' headliners."],
  ['Firefighters', 'firehouse-front-line', 'Firehouse Front Line', 'The Firefighters you already know.'],
  ['Texas Tailgaters', 'texas-openers', 'Texas Openers', 'The Tailgaters leading off.'],
  ['Loco Beach Coconuts', 'coconut-crew', 'Coconut Crew', 'The Coconuts everyone recognizes.'],
  ['Indianapolis Clowns', 'clown-royalty', 'Clown Royalty', 'The Clowns headlining the big top.'],
];
for (const [tname, slug, title, theme] of A1) {
  unit(slug, title, theme, { kind: 'team', teams: [teamSlug(tname)] }, 1, take(9, team(tname)));
}

// ─── ACT 2 — Position school (cross-team, icon motifs) ─────────────────────
// Behind the plate — the catchers not already owned by a team unit, PLUS the
// star catchers (owned by their Act-1 team) as cameos, so the theme reads as
// the whole league's catching corps. Strong-match cameo: a catchers unit that
// left out the star catchers would feel incomplete.
unit('behind-the-plate', 'Behind the Plate', 'Catchers from every dugout.',
  { kind: 'icon', icon: 'shield', accent: '#8b5cf6' }, 2,
  takeAll((p) => fam(p.position_label) === 'C'),
  cameos(['Bill LeRoy', 'Andy Cosgrove', 'Dalton Cornett', 'Joe Lytle', 'Denae Benites', 'Taj Porter']));

// The infield — basemen & shortstops, split into two even rounds.
const ifTotal = P.filter((p) => !claimed.has(p.player_id) && fam(p.position_label) === 'IF').length;
unit('the-infield', 'The Infield', 'Corner to corner around the diamond.',
  { kind: 'icon', icon: 'diamond', accent: '#f59e0b' }, 2,
  take(Math.ceil(ifTotal / 2), (p) => fam(p.position_label) === 'IF'));
unit('middle-infield', 'Turning Two', 'More gloves up the middle.',
  { kind: 'icon', icon: 'diamond', accent: '#f59e0b' }, 2, takeAll((p) => fam(p.position_label) === 'IF'));

// Grass patrol — outfielders, split into two even rounds.
const ofTotal = P.filter((p) => !claimed.has(p.player_id) && fam(p.position_label) === 'OF').length;
unit('grass-patrol', 'Grass Patrol', 'The outfield, tracking everything down.',
  { kind: 'icon', icon: 'target', accent: '#10b981' }, 2,
  take(Math.ceil(ofTotal / 2), (p) => fam(p.position_label) === 'OF'));
unit('warning-track', 'Warning Track', 'The rest of the outfield corps.',
  { kind: 'icon', icon: 'target', accent: '#10b981' }, 2, takeAll((p) => fam(p.position_label) === 'OF'));

// Utility — two-way players, designated runners & hitters (the specialists).
unit('do-it-all', 'Do-It-All', 'Two-way players, runners, and designated bats.',
  { kind: 'icon', icon: 'sparkles', accent: '#ec4899' }, 2,
  takeAll((p) => ['2W', 'DR', 'DH', 'X'].includes(fam(p.position_label))));

// ─── ACT 3 — The mound & the deep cuts (hardest; icon motifs) ──────────────
// Repeat offenders — repeating-digit jersey numbers, league-wide.
const REPEAT = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99]);
unit('repeat-offenders', 'Repeat Offenders', 'Double-digit repeats: #11, #22, #99…',
  { kind: 'icon', icon: 'repeat', accent: '#0ea5e9' }, 3,
  takeAll((p) => REPEAT.has(p.jersey_number)));

// High numbers — the novelty 90s+.
unit('high-numbers', 'The Nineties Club', 'Novelty numbers up in the 90s.',
  { kind: 'icon', icon: 'shirt', accent: '#6366f1' }, 3,
  takeAll((p) => p.jersey_number >= 89));

// The bullpen — relief pitchers, split into rounds so a unit stays digestible.
unit('bullpen-1', 'The Bullpen', 'Relief arms out of the pen.',
  { kind: 'icon', icon: 'flame', accent: '#ef4444' }, 3, take(11, (p) => fam(p.position_label) === 'RP'));
unit('bullpen-2', 'Long Relief', 'Deeper into the bullpen.',
  { kind: 'icon', icon: 'flame', accent: '#ef4444' }, 3, take(11, (p) => fam(p.position_label) === 'RP'));
unit('bullpen-3', 'Mop-Up Duty', 'The last arms in the pen.',
  { kind: 'icon', icon: 'flame', accent: '#ef4444' }, 3, takeAll((p) => fam(p.position_label) === 'RP'));

// Starting rotation — remaining starters.
unit('the-rotation', 'The Rotation', 'Starting pitchers who take the ball first.',
  { kind: 'icon', icon: 'baseball', accent: '#f97316' }, 3, takeAll((p) => fam(p.position_label) === 'SP'));

// Showstoppers — the personality act. Owned: the entertainers who aren't top-9
// team stars (reserved above). Cameos: the famous ones, still owned by their
// team unit but too iconic to leave out of a trick unit — "don't leave RAC out
// of the backflippers." Attributions: RAC & Kyle Jackson (backflip catches),
// Dakota "Stilts" Albritton (stilts), Jackson Olson (viral social star),
// Zach Watson (Texas backflips). Verified via Bananas roster + press.
unit('showstoppers', 'Showstoppers', 'Backflips, stilts, and the viral crowd-workers.',
  { kind: 'icon', icon: 'sparkles', accent: '#f43f5e' }, 3, showstopperOwned,
  cameos(['RobertAnthony Cruz', 'Kyle Jackson', 'Dakota Albritton', 'Jackson Olson', 'Zach Watson']));

// ─── ACT 3 (cont.) — Data-driven performance units ─────────────────────────
// Built from the real hitting/pitching/fielding stats. Each is a leaderboard:
// unclaimed leaders are OWNED here, already-owned leaders come in as CAMEOS so
// the ranking reads complete. Both best- AND worst-side units, because being
// the league's worst is its own kind of famous. Qualifiers (min AB/IP) avoid
// small-sample noise. Ranked over ALL players (owned or not).
const num2 = num;
const qBat = (p) => p.hitting && p.hitting.ab >= 25;
const qPit = (p) => p.pitching && parseFloat(p.pitching.ip) >= 8;
const rank = (pred, cmp) => P.filter(pred).sort(cmp);

// BEST bats — power & production.
performanceUnit('sluggers', 'The Sluggers', 'Most home runs and biggest OPS in the league.',
  { kind: 'icon', icon: 'target', accent: '#eab308' },
  rank(qBat, (a, b) => b.hitting.hr - a.hitting.hr || num2(b.hitting.ops) - num2(a.hitting.ops)), 9,
  PERF_OWNED.sluggers);

// WORST bats — the cold streak.
performanceUnit('cold-streak', 'Cold Streak', 'Lowest batting averages — everyone slumps.',
  { kind: 'icon', icon: 'target', accent: '#64748b' },
  rank(qBat, (a, b) => num2(a.hitting.avg) - num2(b.hitting.avg)), 9, PERF_OWNED.coldStreak);

// BEST arms — aces & strikeout kings.
performanceUnit('the-aces', 'The Aces', 'Lowest ERAs on the mound.',
  { kind: 'icon', icon: 'crown', accent: '#22c55e' },
  rank(qPit, (a, b) => num2(a.pitching.era) - num2(b.pitching.era)), 8, PERF_OWNED.aces);
performanceUnit('strikeout-kings', 'Strikeout Kings', 'The most punchouts in the league.',
  { kind: 'icon', icon: 'zap', accent: '#3b82f6' },
  rank((p) => p.pitching, (a, b) => (b.pitching.so ?? 0) - (a.pitching.so ?? 0)), 8, PERF_OWNED.strikeoutKings);

// WORST arms — batting practice.
performanceUnit('batting-practice', 'Batting Practice', 'Highest ERAs — hitters feast on these arms.',
  { kind: 'icon', icon: 'flame', accent: '#f97316' },
  rank(qPit, (a, b) => num2(b.pitching.era) - num2(a.pitching.era)), 8, PERF_OWNED.battingPractice);

// FIELDING — trick plays (best) and errors (worst). Limit is generous so the
// whole infield-magician crew shows: the TPO board is dominated by middle
// infielders (Luders, Hussein, Cox) and slick first basemen (Brewer, Ziegler).
performanceUnit('trick-play-artists', 'Trick-Play Artists',
  'The infield magicians — most trick-play outs in the league.',
  { kind: 'icon', icon: 'sparkles', accent: '#a855f7' },
  rank((p) => p.fielding, (a, b) => (b.fielding.tpo ?? 0) - (a.fielding.tpo ?? 0)), 14, PERF_OWNED.trickPlay);
performanceUnit('butterfingers', 'Butterfingers', 'Most errors — the glove betrayed them.',
  { kind: 'icon', icon: 'shield', accent: '#ef4444' },
  rank((p) => p.fielding, (a, b) => (b.fielding.e ?? 0) - (a.fielding.e ?? 0)), 9, PERF_OWNED.butterfingers);

// ─── ACT 3 (cont.) — CAREER-stat units ─────────────────────────────────────
// These rank on CAREER totals (all-seasons), the only place the Banana-Ball-
// only stats B4S / SB / WO are exposed. The theme copy says "career" so they
// aren't mistaken for the season stats used everywhere else.
const qCar = (p) => p.career; // has a career block
performanceUnit('sprinters', 'The Sprinters', 'Career Ball-Four Sprints — took off instead of walking.',
  { kind: 'icon', icon: 'rabbit', accent: '#14b8a6' },
  rank(qCar, (a, b) => (b.career.b4s ?? 0) - (a.career.b4s ?? 0)), 10, PERF_OWNED.sprinters);
performanceUnit('base-bandits', 'Base Bandits', 'Career stolen bases — the fastest larcenists.',
  { kind: 'icon', icon: 'zap', accent: '#0ea5e9' },
  rank(qCar, (a, b) => (b.career.sb ?? 0) - (a.career.sb ?? 0)), 10, PERF_OWNED.baseBandits);
performanceUnit('walk-off-kings', 'Walk-Off Kings', 'Career walk-offs — they end ballgames.',
  { kind: 'icon', icon: 'crown', accent: '#f59e0b' },
  rank(qCar, (a, b) => (b.career.wo ?? 0) - (a.career.wo ?? 0)), 10, PERF_OWNED.walkOffs);

// Fan Favorites — career foul-outs-to-fan (a pitching quirk); pitchers only.
performanceUnit('fan-favorites', 'Fan Favorites', 'Career foul-outs-to-fan — the crowd made the play.',
  { kind: 'icon', icon: 'star', accent: '#f43f5e' },
  rank((p) => p.career?.fan, (a, b) => (b.career.fan ?? 0) - (a.career.fan ?? 0)), 10, PERF_OWNED.fanFavorites);

// ─── ACT 3 (cont.) — Experience units ──────────────────────────────────────
// Rookie vs veteran, inferred by comparing CAREER games to this SEASON's games:
// prior = career.g - seasonG. A near-zero prior means this is essentially their
// first season (rookie); a large prior means many seasons behind them (veteran).
// This is a derived signal — the API has no age/debut/rookie field — so the copy
// says "newest/most-tenured," not a literal rookie flag.
const seasonG = (p) => Math.max(p.hitting?.g ?? 0, p.pitching?.g ?? 0, p.fielding?.g ?? 0);
const prior = (p) => (p.career?.g ?? 0) - seasonG(p);
performanceUnit('fresh-faces', 'Fresh Faces', 'Newest to the league — little career history yet.',
  { kind: 'icon', icon: 'sparkles', accent: '#10b981' },
  rank(qCar, (a, b) => prior(a) - prior(b)), 10, PERF_OWNED.freshFaces);
performanceUnit('old-guard', 'The Old Guard', 'The most-tenured — hundreds of games behind them.',
  { kind: 'icon', icon: 'crown', accent: '#78716c' },
  rank(qCar, (a, b) => prior(b) - prior(a)), 10, PERF_OWNED.oldGuard);

// Wild cards — anyone left (the truly obscure), a final grab-bag.
const leftover = takeAll(() => true);
if (leftover.length) {
  unit('wild-cards', 'Wild Cards', 'The deepest cuts — hardest to place, last to learn.',
    { kind: 'icon', icon: 'crown', accent: '#a855f7' }, 3, leftover);
}

// ─── Emit ──────────────────────────────────────────────────────────────────
const total = units.reduce((n, u) => n + u.owned.length, 0);
if (total !== P.length) {
  console.error(`PARTITION ERROR: covered ${total} of ${P.length} players`);
  process.exit(1);
}
// drop empty units defensively
const nonEmpty = units.filter((u) => u.owned.length > 0);
writeFileSync('./src/data/units-2026.json', JSON.stringify(nonEmpty, null, 2) + '\n');
console.log(`${nonEmpty.length} units, ${total}/${P.length} players placed`);
for (const u of nonEmpty) console.log(`  ${String(u.owned.length).padStart(2)}  ${u.title}  (act ${u.act})`);
