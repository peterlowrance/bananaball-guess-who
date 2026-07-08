// Fetches the raw Banana Ball stats for the World Tour season and writes
// data/raw/bananaball-2026-worldtour-raw.json. Pulls all three player-stat
// categories (hitting, pitching, fielding) plus teams + season meta.
//
// Source API (discovered from the stats site's Vite bundle):
//   https://thebananaball.com/stats/api/stats/players/{category}
//     ?season_id=<id>&per_page=100&page=<n>&count_total=1
//   https://thebananaball.com/stats/api/stats/teams?season_id=<id>
//   https://thebananaball.com/stats/api/stats/meta
// Responses are { data: [...], meta: { pagination: { total, last_page, ... } } }.
//
// Run: node scripts/fetch-stats.mjs   (then: node data/build-clean.mjs && npm run sync-data)
import { writeFileSync, mkdirSync } from 'node:fs';

const API = 'https://thebananaball.com/stats/api/stats';
const HEADERS = { 'user-agent': 'Mozilla/5.0 (bbgw-dataset-sync)', Accept: 'application/json' };
// 2026 World Tour — the season the dataset targets.
const SEASON_ID = 'e3acccd7-0c28-4eb8-aacf-cf907ee5c6f6';

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) {
    throw new Error(`bad response ${res.status} ${ct} for ${url}`);
  }
  return res.json();
}

/** Fetch every page of a player-stats category. */
// Fetch every page of a player-stats category. Pass { career: true } to omit
// season_id — that returns the all-seasons AGGREGATE, which carries extra
// columns the season-scoped slice drops (b4s, sb, wo). Career rows span all
// players/seasons (~632); we merge only the fields we want, keyed by player_id.
async function fetchCategory(category, { career = false } = {}) {
  const rows = [];
  let page = 1;
  let lastPage = 1;
  do {
    const season = career ? '' : `season_id=${SEASON_ID}&`;
    const url = `${API}/players/${category}?${season}per_page=100&page=${page}&count_total=1&sort=g&direction=desc`;
    const j = await getJson(url);
    rows.push(...(j.data ?? []));
    lastPage = j.meta?.pagination?.last_page ?? page;
    page += 1;
  } while (page <= lastPage);
  console.log(`  ${career ? 'career ' : ''}${category}: ${rows.length} rows`);
  return rows;
}

// Fetch each player's detail endpoint to capture stats the bulk leaderboards
// omit — career FAN (foul-outs-to-fan, a pitching stat) and ER. Concurrency-
// limited so we don't hammer the API. Returns { player_id -> { fan, er } }.
async function fetchDetails(playerIds) {
  const out = {};
  const CONCURRENCY = 6;
  let i = 0;
  async function worker() {
    while (i < playerIds.length) {
      const id = playerIds[i++];
      try {
        const j = await getJson(`${API}/players/${id}`);
        const cp = (j.data ?? j).career?.pitching ?? {};
        out[id] = { fan: cp.fan ?? null, er: cp.er ?? null };
      } catch {
        out[id] = { fan: null, er: null };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`  details: ${Object.keys(out).length} players`);
  return out;
}

async function main() {
  console.log(`Fetching Banana Ball stats (season ${SEASON_ID})…`);
  const meta = await getJson(`${API}/meta`).catch(() => ({}));
  const teamsResp = await getJson(`${API}/teams?season_id=${SEASON_ID}`).catch(() => ({ data: [] }));
  const [hitting, pitching, fielding, careerHitting] = await Promise.all([
    fetchCategory('hitting'),
    fetchCategory('pitching'),
    fetchCategory('fielding'),
    // Career (all-seasons) hitting — the only place b4s/sb/wo are exposed.
    fetchCategory('hitting', { career: true }),
  ]);

  // Per-player details for career FAN/ER (not in any bulk leaderboard). Only
  // for players present in our season blocks, not all 632 career rows.
  const seasonIds = [...new Set([...hitting, ...pitching, ...fielding].map((r) => r.player_id))];
  const details = await fetchDetails(seasonIds);

  // Keep just the career-only fields, keyed by player_id, so nothing here can
  // be mistaken for a 2026 World Tour season stat. Merge in FAN/ER from details.
  const career = careerHitting.map((r) => ({
    player_id: r.player_id,
    g: r.g, // career games (for context / qualifiers)
    b4s: r.b4s ?? null,
    sb: r.sb ?? null,
    wo: r.wo ?? null,
    fan: details[r.player_id]?.fan ?? null,
    er: details[r.player_id]?.er ?? null,
  }));

  const teams = (teamsResp.data ?? teamsResp).map?.((t) => ({
    team_id: t.team_id,
    slug: t.slug,
    name: t.team_name ?? t.name,
    abbreviation: t.abbreviation,
    logo: t.logo?.id ?? t.logo,
  })) ?? [];

  const out = {
    fetchedSeasonId: SEASON_ID,
    seasons: meta.data?.seasons ?? meta.seasons ?? [],
    teams,
    hitting,
    pitching,
    fielding,
    career,
  };

  const dir = new URL('../data/raw/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const dest = new URL('bananaball-2026-worldtour-raw.json', dir);
  writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`Wrote ${dest.pathname} (${hitting.length}H / ${pitching.length}P / ${fielding.length}F / ${career.length} career)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
