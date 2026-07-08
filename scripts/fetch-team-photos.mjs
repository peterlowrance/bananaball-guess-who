// Fetches official media-day player photos from the three team sites that
// publish per-player photos via WordPress REST, and writes a name-keyed sidecar
// (data/team-photos.json) that data/build-clean.mjs merges into each player's
// images[] array. Run manually when rosters/photos change:  node scripts/fetch-team-photos.mjs
//
// Why only three teams: of the six 2026 teams, only Party Animals, Savannah
// Bananas, and Firefighters expose individual player photos (WP custom post
// types `player` / `player-card`, each with a featured media-day image). The
// other three (Texas Tailgaters, Loco Beach Coconuts, Indianapolis Clowns) are
// hosted on bananaball.com and publish only a single flat roster-sheet image, so
// there is nothing per-player to fetch. Those players keep just their neutral
// stats headshot. The photos are full-uniform shots, which is fine: the app
// already hides the photo on the "which team?" question, so the uniform can't
// give the answer away.
//
// Multi-season photos were investigated at the API level and ruled out. The
// stats site is a Vue app backed by https://thebananaball.com/stats/api/stats;
// its player endpoint (players/{slug}?season_id=…) returns profile.image. Passing
// different season_ids (2023/2024/2025/2026 World Tours) for several veterans
// (Bill LeRoy, Dakota Albritton, Jackson Olson) returns the SAME image.id every
// time — the system stores one canonical headshot per player, keyed to the
// player, not the season. So there is no per-season photo variety to harvest.
import { writeFileSync } from 'node:fs';

// Decode the handful of HTML entities WP puts in post titles (e.g. a curly
// apostrophe becomes &#8217;). Enough for names; not a full HTML decoder.
function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

// team_name here MUST match the dataset's team_name so the build can key on it.
const SITES = [
  { team: 'Party Animals', base: 'https://thepartyanimals.com', type: 'player' },
  { team: 'Savannah Bananas', base: 'https://thesavannahbananas.com', type: 'player-card' },
  { team: 'Firefighters', base: 'https://thefirefighters.com', type: 'player-card' },
];

// Normalize a display name for matching: lowercase, strip punctuation, collapse
// spaces. Matches the tolerance we need against occasional casing/typo drift
// between the stats API names and the team-site post titles (e.g. "John-Howard
// BObo"). The build does the actual player<->name pairing; we just normalize.
function normName(s) {
  return decodeEntities(s)
    .toLowerCase()
    .normalize('NFKD')
    // strip punctuation to NOTHING (not a space) so "T.J." matches "TJ" and
    // "Ga'von" matches "Gavon"
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchTeam({ team, base, type }) {
  const url = `${base}/wp-json/wp/v2/${type}?per_page=100&_embed=wp:featuredmedia`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (bbgw-dataset-sync)' } });
  if (!res.ok) throw new Error(`${team}: HTTP ${res.status} from ${url}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`${team}: unexpected payload shape`);
  const byName = {};
  for (const row of rows) {
    const name = decodeEntities(row?.title?.rendered ?? '').trim();
    const media = row?._embedded?.['wp:featuredmedia']?.[0];
    const src = media?.source_url;
    if (!name || !src) continue;
    // Prefer a reasonably-sized rendition over the full-res original (some are
    // 5-10MB). WP exposes sizes under media.media_details.sizes.
    const sizes = media?.media_details?.sizes ?? {};
    const preferred =
      sizes.large?.source_url ??
      sizes.medium_large?.source_url ??
      sizes.medium?.source_url ??
      src;
    byName[normName(name)] = { name, url: preferred };
  }
  return byName;
}

const out = {};
const report = {};
for (const site of SITES) {
  try {
    const byName = await fetchTeam(site);
    out[site.team] = byName;
    report[site.team] = Object.keys(byName).length;
    console.log(`✓ ${site.team}: ${Object.keys(byName).length} photos`);
  } catch (err) {
    console.error(`✗ ${site.team}: ${err.message}`);
    out[site.team] = {};
    report[site.team] = 0;
  }
}

const payload = {
  source: 'official team WordPress sites (wp/v2 player | player-card, _embed featuredmedia)',
  fetched_note: 'Regenerate with: node scripts/fetch-team-photos.mjs',
  teams: SITES.map((s) => s.team),
  counts: report,
  photos: out, // { [team_name]: { [normalizedName]: { name, url } } }
};

const dest = new URL('../data/team-photos.json', import.meta.url);
writeFileSync(dest, JSON.stringify(payload, null, 2));
console.log('\nWrote', dest.pathname, '—', Object.values(report).reduce((a, b) => a + b, 0), 'photos total');
