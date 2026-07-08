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
async function fetchCategory(category) {
  const rows = [];
  let page = 1;
  let lastPage = 1;
  do {
    const url = `${API}/players/${category}?season_id=${SEASON_ID}&per_page=100&page=${page}&count_total=1&sort=g&direction=desc`;
    const j = await getJson(url);
    rows.push(...(j.data ?? []));
    lastPage = j.meta?.pagination?.last_page ?? page;
    page += 1;
  } while (page <= lastPage);
  console.log(`  ${category}: ${rows.length} rows`);
  return rows;
}

async function main() {
  console.log(`Fetching Banana Ball stats (season ${SEASON_ID})…`);
  const meta = await getJson(`${API}/meta`).catch(() => ({}));
  const teamsResp = await getJson(`${API}/teams?season_id=${SEASON_ID}`).catch(() => ({ data: [] }));
  const [hitting, pitching, fielding] = await Promise.all([
    fetchCategory('hitting'),
    fetchCategory('pitching'),
    fetchCategory('fielding'),
  ]);

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
  };

  const dir = new URL('../data/raw/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const dest = new URL('bananaball-2026-worldtour-raw.json', dir);
  writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`Wrote ${dest.pathname} (${hitting.length}H / ${pitching.length}P / ${fielding.length}F)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
