import { Link } from 'react-router-dom';

/** Temporary screen used while a feature stage is pending. */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="text-5xl">🍌</div>
      <h1 className="text-2xl font-black">{title}</h1>
      {note && <p className="text-[var(--muted)]">{note}</p>}
      <Link to="/settings" className="text-sm font-bold text-[var(--muted)] underline">
        Settings
      </Link>
    </div>
  );
}
