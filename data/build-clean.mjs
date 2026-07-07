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

// Merge hitting + pitching per player_id
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
      };
    }
    const p = byId[r.player_id];
    if (kind === 'hitting') {
      p.hitting = { g: r.g, ab: r.ab, r: r.r, h: r.h, rbi: r.rbi, hr: r.hr, avg: r.avg_display, ops: r.ops_display };
    } else {
      // pitching fields — keep whatever exists
      p.pitching = {
        g: r.g ?? null, w: r.w ?? null, l: r.l ?? null, sv: r.sv ?? null,
        ip: r.ip_display ?? r.ip ?? null, so: r.so ?? null, era: r.era_display ?? null,
      };
    }
  }
}
ingest(raw.hitting, 'hitting');
ingest(raw.pitching, 'pitching');

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
