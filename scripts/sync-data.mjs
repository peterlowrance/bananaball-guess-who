// Copies the built dataset from the research pipeline (data/players-2026.json)
// into src/data/ where the app imports it. Run via `npm run sync-data`.
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'data', 'players-2026.json');
const destDir = join(root, 'src', 'data');
const dest = join(destDir, 'players-2026.json');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`synced ${src} -> ${dest}`);
