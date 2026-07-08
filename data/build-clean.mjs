import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('./raw/bananaball-2026-worldtour-raw.json', import.meta.url)));

const CORE_TEAMS = [
  'Savannah Bananas',
  'Party Animals',
  'Firefighters',
  'Texas Tailgaters',
  'Loco Beach Coconuts',
  'Indianapolis Clowns',
];

const LOGO_BASE = 'https://thebananaball.com/stats/teams/';

// team_id -> team meta (only core teams have players, but keep logos for all referenced teams)
const teamById = {};
for (const t of raw.teams) {
  teamById[t.team_id] = {
    team_id: t.team_id,
    name: t.name,
    abbreviation: t.abbreviation,
    slug: t.slug,
    logo_url: `${LOGO_BASE}${t.logo}.webp`,
  };
}

// Merge hitting + pitching + fielding per player_id
const byId = {};
function ingest(rows, kind) {
  for (const r of rows) {
    if (!byId[r.player_id]) {
      byId[r.player_id] = {
        player_id: r.player_id,
        slug: r.slug,
        name: r.player_name,
        team_id: r.team_id,
        team_name: r.team_name,
        jersey_number: r.jersey_number,
        position_label: r.position_label,
        image_url: r.image?.url ?? null,
        hitting: null,
        pitching: null,
        fielding: null,
        career: null,
      };
    }
    const p = byId[r.player_id];
    if (kind === 'hitting') {
      p.hitting = { g: r.g, ab: r.ab, r: r.r, h: r.h, rbi: r.rbi, hr: r.hr, avg: r.avg_display, ops: r.ops_display };
    } else if (kind === 'pitching') {
      // Source codes: k = strikeouts, saves = saves, gs = games started.
      p.pitching = {
        g: r.g ?? null, gs: r.gs ?? null, w: r.w ?? null, l: r.l ?? null, sv: r.saves ?? null,
        ip: r.ip_display ?? (r.ip != null ? String(r.ip) : null), so: r.k ?? null,
        era: r.era_display ?? null, runs_allowed: r.runs_allowed ?? null, hits_allowed: r.hits_allowed ?? null,
      };
    } else {
      // fielding — e = errors, tpo = trick_play_outs, tpm = trick_plays_missed.
      p.fielding = {
        g: r.g ?? null, e: r.e ?? null, air_outs: r.air_outs ?? null, ground_outs: r.ground_outs ?? null,
        tpo: r.trick_play_outs ?? null, tpm: r.trick_plays_missed ?? null,
        trick_play_rate: r.trick_play_rate_display ?? null,
      };
    }
  }
}
ingest(raw.hitting, 'hitting');
ingest(raw.pitching, 'pitching');
ingest(raw.fielding, 'fielding');

// Merge CAREER-only stats (all-seasons aggregate). Kept in a distinct `career`
// block so these totals are never confused with the 2026 World Tour season
// stats above. Source exposes b4s/sb/wo only in the no-season aggregate, and
// returns one row per (player, team-stint) — so a player who changed teams has
// several rows. SUM them per player_id for a true career total.
const careerTotals = {};
for (const c of raw.career ?? []) {
  const t = (careerTotals[c.player_id] ??= { g: 0, b4s: 0, sb: 0, wo: 0 });
  t.g += c.g ?? 0;
  t.b4s += c.b4s ?? 0;
  t.sb += c.sb ?? 0;
  t.wo += c.wo ?? 0;
}
for (const [id, t] of Object.entries(careerTotals)) {
  if (byId[id]) byId[id].career = t;
}

// Filter to 6 core teams, and drop one-off celebrity guest players
let players = Object.values(byId).filter(
  (p) => CORE_TEAMS.includes(p.team_name) && p.position_label !== 'Guest Player'
);

// Sort by team then jersey number for stable output (re-sorted by popularity after merge)
players.sort((a, b) => a.team_name.localeCompare(b.team_name) || (a.jersey_number - b.jersey_number));

// Difficulty tiers come from per-team popularity research (data/research/*.json),
// which ranked each roster by fan recognition using external signals (social
// following, viral moments, media coverage, prior pro fame). We match by exact
// player name within each team and attach difficulty + popularity_rank + confidence.
import { readdirSync } from 'node:fs';
const researchDir = new URL('./research/', import.meta.url);
const rankByTeamName = {}; // team -> { playerName -> {tier, popularity_rank, confidence} }
for (const f of readdirSync(researchDir).filter((f) => f.endsWith('.json'))) {
  const r = JSON.parse(readFileSync(new URL(f, researchDir)));
  const map = {};
  for (const p of r.players) {
    map[p.name] = { tier: p.tier, popularity_rank: p.popularity_rank, confidence: p.confidence };
  }
  rankByTeamName[r.team] = map;
}

const unmatched = [];
for (const p of players) {
  const teamMap = rankByTeamName[p.team_name] || {};
  const hit = teamMap[p.name];
  if (hit) {
    p.difficulty = hit.tier;
    p.popularity_rank = hit.popularity_rank;
    p.popularity_confidence = hit.confidence;
  } else {
    p.difficulty = 'medium'; // safe fallback
    p.popularity_rank = null;
    p.popularity_confidence = 'unmatched';
    unmatched.push(`${p.name} (${p.team_name})`);
  }
}
if (unmatched.length) {
  console.log('\n⚠️  UNMATCHED players (name mismatch between API and research):');
  unmatched.forEach((u) => console.log('   -', u));
}

// ─── Player images: build a filtered, multi-source images[] per player ───────
// Two problems this solves:
//  1. A few stats "photos" (e.g. the Clowns mascot "Peanuts The Elephant") are
//     served from thebananaball.com/stats with a .webp extension but actually
//     return an HTML placeholder page (content-type text/html), which the app
//     renders as a broken image before falling back to initials. We HEAD-check
//     every stats URL and drop any that isn't really an image.
//  2. Three teams (Party Animals, Savannah, Firefighters) publish official
//     media-day photos per player; adding them gives the app photo VARIETY.
//     data/team-photos.json is produced by scripts/fetch-team-photos.mjs.

// Decode WP HTML entities + normalize for name matching (mirror of the fetch script).
function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'");
}
function normName(s) {
  return decodeEntities(s).toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Nickname-only or shortened team-site titles that normalization can't reconcile
// with the stats-API display name. Keyed by normalized dataset name -> the team
// site's normalized name. Keep this tiny and obvious.
const NAME_ALIASES = {
  'mike ballard': 'michael ballard',
  'kyle jackson': 'kj jackson',
  'dakota albritton': 'stilts',
};

let teamPhotos = { photos: {} };
try {
  teamPhotos = JSON.parse(readFileSync(new URL('./team-photos.json', import.meta.url)));
} catch {
  console.log('\n⚠️  data/team-photos.json missing — run `node scripts/fetch-team-photos.mjs`. Photos will be stats-only.');
}

// Is a URL a real image (200 + image/* content-type)? Guards against the
// HTML-placeholder .webp URLs. Fails closed (treats errors as not-an-image only
// after a real network failure — see caller, which keeps the URL if the check
// itself errors so a flaky network doesn't strip everyone's photo).
async function isRealImage(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'user-agent': 'Mozilla/5.0 (bbgw-dataset-sync)' } });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    return ct.startsWith('image/');
  } catch {
    return null; // unknown — network error, not a definitive "not an image"
  }
}

let droppedStats = 0;
let mediaAdded = 0;
const noPhotoAtAll = [];
for (const p of players) {
  const images = [];

  // 1. Validate the stats headshot.
  const statsOk = await isRealImage(p.image_url);
  if (p.image_url && statsOk !== false) {
    // keep on true OR null (network-unknown); only drop on a definitive false
    images.push(p.image_url);
    if (statsOk === null) console.log(`   (network-unknown, kept) ${p.name}: ${p.image_url}`);
  } else if (p.image_url) {
    droppedStats++;
    console.log(`   dropped non-image stats URL: ${p.name} (${p.team_name})`);
  }

  // 2. Append the official media-day photo when we can match it by name.
  const teamMap = teamPhotos.photos?.[p.team_name] || {};
  const key = normName(p.name);
  const hit = teamMap[key] || teamMap[NAME_ALIASES[key]];
  if (hit?.url && !images.includes(hit.url)) {
    images.push(hit.url);
    mediaAdded++;
  }

  p.images = images;
  // image_url stays as the primary (first available) for backward compatibility.
  p.image_url = images[0] ?? null;
  if (images.length === 0) noPhotoAtAll.push(`${p.name} (${p.team_name})`);
}
console.log(`\nImages: dropped ${droppedStats} non-image stats URL(s), added ${mediaAdded} media-day photo(s).`);
if (noPhotoAtAll.length) {
  console.log(`⚠️  ${noPhotoAtAll.length} player(s) have NO real photo from any source (will render the initials avatar):`);
  noPhotoAtAll.forEach((n) => console.log('   -', n));
}

// Final sort: team, then popularity rank (most famous first), nulls last
players.sort(
  (a, b) =>
    a.team_name.localeCompare(b.team_name) ||
    (a.popularity_rank ?? 999) - (b.popularity_rank ?? 999)
);

const coreTeams = raw.teams
  .filter((t) => CORE_TEAMS.includes(t.name))
  .map((t) => teamById[t.team_id]);

const out = {
  source: 'thebananaball.com/stats/api',
  season: '2026 World Tour',
  season_id: raw.fetchedSeasonId,
  generated_from: 'data/raw/bananaball-2026-worldtour-raw.json',
  team_count: coreTeams.length,
  player_count: players.length,
  teams: coreTeams,
  players,
};

mkdirSync(new URL('./', import.meta.url), { recursive: true });
writeFileSync(new URL('./players-2026.json', import.meta.url), JSON.stringify(out, null, 2));

// Summary to stdout
const perTeam = {};
for (const p of players) perTeam[p.team_name] = (perTeam[p.team_name] || 0) + 1;
const perDiff = {};
for (const p of players) perDiff[p.difficulty] = (perDiff[p.difficulty] || 0) + 1;
console.log('Teams:', coreTeams.length);
console.log('Players:', players.length);
console.log('Per team:', perTeam);
console.log('Per difficulty:', perDiff);
console.log('No image:', players.filter((p) => !p.image_url).length);
console.log('Sample:', JSON.stringify(players[0], null, 2));
