import dataset from './data/players-2026.json';

// Stage 0 "hello banana": proves the scaffold, dataset import, PWA, and Pages
// base path all work end to end before any feature code is written.
export default function App() {
  const teams = dataset.teams;
  const players = dataset.players;
  const sample = players[0];

  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col items-center gap-6 px-6 py-12 text-center">
      <div className="text-7xl">🍌</div>
      <h1 className="text-3xl font-black tracking-tight">Bananaball Guess Who</h1>
      <p className="text-neutral-600">
        Learn every Banana Ball player — Duolingo-style.
      </p>

      <div className="w-full rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex justify-around">
          <Stat label="Teams" value={teams.length} />
          <Stat label="Players" value={players.length} />
          <Stat
            label="Easy tier"
            value={players.filter((p) => p.difficulty === 'easy').length}
          />
        </div>
      </div>

      {sample && (
        <div className="w-full rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-neutral-400">
            Sample player (image hotlink test)
          </p>
          <img
            src={sample.image_url}
            alt={sample.name}
            width={120}
            height={120}
            className="mx-auto rounded-2xl object-cover"
          />
          <p className="mt-3 font-bold">{sample.name}</p>
          <p className="text-sm text-neutral-500">
            #{sample.jersey_number} · {sample.position_label} · {sample.team_name}
          </p>
        </div>
      )}

      <p className="mt-auto text-xs text-neutral-400">Stage 0 · scaffold live</p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-black text-[var(--color-banana-dark)]">
        {value}
      </div>
      <div className="text-xs font-semibold text-neutral-400">{label}</div>
    </div>
  );
}
