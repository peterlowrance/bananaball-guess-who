// 5-segment banana strength meter (Leitner box 1-5). Segments desaturate when
// the player is past due ("going brown") — presentational only.
export function StrengthMeter({ box, overdue }: { box: number; overdue?: boolean }) {
  return (
    <div className="flex gap-0.5" aria-label={`strength ${box} of 5`}>
      {[1, 2, 3, 4, 5].map((seg) => {
        const filled = box >= seg;
        return (
          <span
            key={seg}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: filled ? (overdue ? 'var(--muted)' : 'var(--team, #f4b400)') : 'var(--hairline)',
            }}
          />
        );
      })}
    </div>
  );
}
