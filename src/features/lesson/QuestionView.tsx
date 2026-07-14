import { useState } from 'react';
import type { SessionQuestion } from '../../engine/quiz/types';
import { getPlayer, getTeam, teamByName, players as allPlayers } from '../../data/dataset';
import { PlayerImage } from '../shared/PlayerImage';
import { TeamLogo } from '../shared/TeamLogo';
import { useTap } from '../shared/useTap';
import { checkTypedAnswer } from '../../engine/quiz/answer-check';

export interface AnswerPayload {
  correct: boolean;
  confusedWith?: string | null;
}

interface Props {
  question: SessionQuestion;
  onAnswer: (p: AnswerPayload) => void;
  disabled: boolean;
  revealCorrect: number | null;
  pickedIndex: number | null;
}

export function QuestionView(props: Props) {
  switch (props.question.type) {
    case 'photo-to-name':
      return <PhotoToName {...props} />;
    case 'first-name':
      return <PartialName {...props} prompt="Pick the FIRST name" />;
    case 'last-name':
      return <PartialName {...props} prompt="Whose LAST name is this?" />;
    case 'name-to-photo':
      return <NameToPhoto {...props} />;
    case 'which-team':
      return <WhichTeam {...props} />;
    case 'jersey':
      return <JerseyPick {...props} />;
    case 'position':
      return <PositionPick {...props} />;
    case 'build-name':
      return <BuildName {...props} />;
    case 'build-first':
      return <BuildLetters {...props} prompt="Spell the FIRST name" />;
    case 'build-last':
      return <BuildLetters {...props} prompt="Spell the LAST name" />;
    case 'type-name':
      return <TypeName {...props} />;
  }
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-center text-xl font-black">{children}</h2>;
}

// About half of identification questions surface the target's number/position
// alongside the prompt, so those facts get rehearsed while you're recalling the
// name/face (not only in feedback). Deterministic per question id — no flicker
// on re-render, and a requeued retry keeps its hint.
function showFactHint(q: SessionQuestion): boolean {
  let h = 0;
  const s = q.id + q.targetId;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h & 1) === 0;
}

function FactHint({ player }: { player: ReturnType<typeof getPlayer> }) {
  return (
    <p className="mb-4 text-center text-sm font-bold text-[var(--muted)]">
      #{player.jersey_number} · {player.position_label}
    </p>
  );
}

type CState = 'idle' | 'correct' | 'wrong' | 'dim';
function choiceState(i: number, reveal: number | null, picked: number | null): CState {
  if (reveal === null) return 'idle';
  if (i === reveal) return 'correct';
  if (i === picked) return 'wrong';
  return 'dim';
}

function ChoiceButton({
  label,
  onClick,
  disabled,
  state,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  state: CState;
}) {
  const cls =
    state === 'correct'
      ? 'border-[var(--ok)] bg-[var(--ok)] text-white'
      : state === 'wrong'
        ? 'border-[var(--bad)] bg-[var(--bad)] text-white'
        : state === 'dim'
          ? 'border-[var(--hairline)] opacity-50'
          : 'border-[var(--hairline)] active:scale-[0.98]';
  const anim =
    state === 'correct' ? 'animate-[pop_0.3s_ease-out]' : state === 'wrong' ? 'animate-[shake_0.4s]' : '';
  const tap = useTap(onClick, disabled);
  return (
    <button
      {...tap}
      disabled={disabled}
      className={`w-full touch-manipulation rounded-2xl border-2 p-4 text-center font-bold transition ${cls} ${anim}`}
    >
      {label}
    </button>
  );
}

// Generic touch-tolerant button: fires `onPick` on a tap even if the finger
// slid slightly. Use anywhere a quiz control needs custom content/styling.
function TapButton({
  onPick,
  disabled,
  className,
  children,
}: {
  onPick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const tap = useTap(onPick, disabled);
  return (
    <button {...tap} disabled={disabled} className={`touch-manipulation ${className ?? ''}`}>
      {children}
    </button>
  );
}

// A tappable player-photo tile (used by name-to-photo). Same touch-tolerant tap.
function PhotoChoice({
  player,
  onPick,
  disabled,
  state,
}: {
  player: ReturnType<typeof getPlayer>;
  onPick: () => void;
  disabled: boolean;
  state: CState;
}) {
  const tap = useTap(onPick, disabled);
  return (
    <button
      {...tap}
      disabled={disabled}
      className={`touch-manipulation overflow-hidden rounded-2xl border-4 transition active:scale-[0.98] ${
        state === 'correct'
          ? 'border-[var(--ok)]'
          : state === 'wrong'
            ? 'border-[var(--bad)]'
            : state === 'dim'
              ? 'border-transparent opacity-40'
              : 'border-transparent'
      }`}
    >
      <PlayerImage player={player} size={150} rounded="rounded-none" className="w-full" />
    </button>
  );
}

function PhotoToName({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  const hint = showFactHint(q);
  return (
    <div>
      <Prompt>Who is this?</Prompt>
      <div className={`${hint ? 'mb-2' : 'mb-6'} flex justify-center`}>
        <PlayerImage player={target} size={200} rounded="rounded-3xl" />
      </div>
      {hint && <FactHint player={target} />}
      <div className="grid grid-cols-1 gap-3">
        {q.choices.map((c, i) => (
          <ChoiceButton
            key={c.playerId + i}
            label={c.label}
            disabled={disabled}
            state={choiceState(i, revealCorrect, pickedIndex)}
            onClick={() => onAnswer({ correct: i === q.correctIndex, confusedWith: c.playerId })}
          />
        ))}
      </div>
    </div>
  );
}

function PartialName({ question: q, onAnswer, disabled, revealCorrect, pickedIndex, prompt }: Props & { prompt: string }) {
  const target = getPlayer(q.targetId);
  const hint = showFactHint(q);
  return (
    <div>
      <Prompt>{prompt}</Prompt>
      <div className={`${hint ? 'mb-2' : 'mb-6'} flex justify-center`}>
        <PlayerImage player={target} size={200} rounded="rounded-3xl" />
      </div>
      {hint && <FactHint player={target} />}
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => (
          <ChoiceButton
            key={c.playerId + i}
            label={c.label}
            disabled={disabled}
            state={choiceState(i, revealCorrect, pickedIndex)}
            onClick={() => onAnswer({ correct: i === q.correctIndex, confusedWith: c.playerId })}
          />
        ))}
      </div>
    </div>
  );
}

function NameToPhoto({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  return (
    <div>
      <Prompt>Pick {target.name}</Prompt>
      {showFactHint(q) && <FactHint player={target} />}
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => (
          <PhotoChoice
            key={c.playerId + i}
            player={getPlayer(c.playerId)}
            disabled={disabled}
            state={choiceState(i, revealCorrect, pickedIndex)}
            onPick={() => onAnswer({ correct: i === q.correctIndex, confusedWith: c.playerId })}
          />
        ))}
      </div>
    </div>
  );
}

function WhichTeam({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  // No photo here on purpose: the player's picture often gives away the team
  // (uniform colors), so we show text-only identity cues instead.
  return (
    <div>
      <Prompt>What team is {target.name} on?</Prompt>
      <div className="mb-6 rounded-2xl border-2 border-[var(--hairline)] p-4 text-center">
        <p className="text-2xl font-black">{target.name}</p>
        <p className="mt-1 font-bold text-[var(--muted)]">
          #{target.jersey_number} · {target.position_label}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => {
          const team = getTeam(c.playerId);
          const st = choiceState(i, revealCorrect, pickedIndex);
          return (
            <TapButton
              key={c.playerId + i}
              disabled={disabled}
              onPick={() => onAnswer({ correct: i === q.correctIndex })}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 font-bold transition active:scale-[0.98] ${
                st === 'correct'
                  ? 'border-[var(--ok)] bg-[var(--ok)] text-white'
                  : st === 'wrong'
                    ? 'border-[var(--bad)] bg-[var(--bad)] text-white'
                    : st === 'dim'
                      ? 'border-[var(--hairline)] opacity-40'
                      : 'border-[var(--hairline)]'
              }`}
            >
              <TeamLogo teamName={team.name} size={40} />
              <span className="text-sm leading-tight">{team.name}</span>
            </TapButton>
          );
        })}
      </div>
    </div>
  );
}

function JerseyPick({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  return (
    <div>
      <Prompt>What number does {target.name} wear?</Prompt>
      <div className="mb-6 flex justify-center">
        <PlayerImage player={target} size={160} rounded="rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => (
          <ChoiceButton
            key={i}
            label={`#${c.label}`}
            disabled={disabled}
            state={choiceState(i, revealCorrect, pickedIndex)}
            onClick={() => onAnswer({ correct: i === q.correctIndex })}
          />
        ))}
      </div>
    </div>
  );
}

function PositionPick({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  return (
    <div>
      <Prompt>Which player is a {target.position_label}?</Prompt>
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => {
          const p = getPlayer(c.playerId);
          const st = choiceState(i, revealCorrect, pickedIndex);
          return (
            <TapButton
              key={c.playerId + i}
              disabled={disabled}
              onPick={() => onAnswer({ correct: i === q.correctIndex, confusedWith: c.playerId })}
              className={`flex flex-col items-center gap-1 overflow-hidden rounded-2xl border-4 pb-2 transition active:scale-[0.98] ${
                st === 'correct'
                  ? 'border-[var(--ok)]'
                  : st === 'wrong'
                    ? 'border-[var(--bad)]'
                    : st === 'dim'
                      ? 'border-transparent opacity-40'
                      : 'border-transparent'
              }`}
            >
              <PlayerImage player={p} size={130} rounded="rounded-none" className="w-full" />
              <span className="text-xs font-bold">{p.name}</span>
            </TapButton>
          );
        })}
      </div>
    </div>
  );
}

function BuildName({ question: q, onAnswer, disabled }: Props) {
  const target = getPlayer(q.targetId);
  // Track tiles by index so duplicate words stay distinct.
  const [slots, setSlots] = useState<number[]>([]);
  const tiles = q.tiles ?? [];
  const built = slots.map((i) => tiles[i]).join(' ');
  const toggle = (i: number) =>
    setSlots((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  return (
    <div>
      <Prompt>Spell the name</Prompt>
      <div className="mb-4 flex justify-center">
        <PlayerImage player={target} size={160} rounded="rounded-3xl" />
      </div>
      {/* Preview of what's built — fixed height so the tiles below never shift
          down as words are added. */}
      <div className="mb-3 flex h-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--hairline)] p-3 text-center text-lg font-bold">
        {built ? built : <span className="text-[var(--muted)]">tap tiles below</span>}
      </div>
      {/* Tiles stay put; picked ones gray out in place instead of moving. */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {tiles.map((tile, i) => {
          const picked = slots.includes(i);
          return (
            <TapButton
              key={i}
              disabled={disabled}
              onPick={() => toggle(i)}
              className={`rounded-xl border-2 px-3 py-2 font-bold transition active:scale-95 ${
                picked
                  ? 'border-transparent bg-[var(--hairline)] text-[var(--muted)] opacity-50'
                  : 'border-[var(--hairline)]'
              }`}
            >
              {tile}
            </TapButton>
          );
        })}
      </div>
      <TapButton
        onPick={() => onAnswer({ correct: built === q.answerText })}
        disabled={disabled || slots.length === 0}
        className="w-full rounded-2xl bg-[var(--ok-strong)] py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Check
      </TapButton>
    </div>
  );
}

function BuildLetters({ question: q, onAnswer, disabled, prompt }: Props & { prompt: string }) {
  const target = getPlayer(q.targetId);
  const [slots, setSlots] = useState<number[]>([]);
  const tiles = q.tiles ?? [];
  const built = slots.map((i) => tiles[i]).join('');
  const answer = (q.answerText ?? '').replace(/[^a-zA-Z]/g, '');
  const correct = built.toLowerCase() === answer.toLowerCase();
  const toggle = (i: number) =>
    setSlots((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  return (
    <div>
      <Prompt>{prompt}</Prompt>
      <div className="mb-4 flex justify-center">
        <PlayerImage player={target} size={160} rounded="rounded-3xl" />
      </div>
      {/* Assembled letters as plain text — fixed height so the tiles below
          never shift down when text appears/grows. */}
      <div className="mb-3 flex h-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--hairline)] p-3 text-center text-2xl font-black tracking-widest">
        {built ? built : <span className="text-base tracking-normal text-[var(--muted)]">tap letters below</span>}
      </div>
      {/* Tile bank: picked tiles gray out in place rather than repositioning.
          Tiles may be single letters or 2-3 letter chunks, so width is auto
          (min-w keeps single letters square-ish) with horizontal padding. */}
      <div className="mb-4 flex flex-wrap justify-center gap-1.5">
        {tiles.map((tile, i) => {
          const picked = slots.includes(i);
          return (
            <TapButton
              key={i}
              disabled={disabled}
              onPick={() => toggle(i)}
              className={`h-10 min-w-9 rounded-lg border-2 px-2 font-black tracking-wide transition active:scale-95 ${
                picked
                  ? 'border-transparent bg-[var(--hairline)] text-[var(--muted)] opacity-50'
                  : 'border-[var(--hairline)]'
              }`}
            >
              {tile}
            </TapButton>
          );
        })}
      </div>
      <TapButton
        onPick={() => onAnswer({ correct })}
        disabled={disabled || slots.length === 0}
        className="w-full rounded-2xl bg-[var(--ok-strong)] py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Check
      </TapButton>
    </div>
  );
}

function TypeName({ question: q, onAnswer, disabled }: Props) {
  const target = getPlayer(q.targetId);
  const [value, setValue] = useState('');
  const teamHint = teamByName.get(target.team_name);
  const submit = () => {
    const res = checkTypedAnswer(value, q.targetId, allPlayers);
    onAnswer({ correct: res.correct, confusedWith: res.closestId });
  };
  return (
    <div>
      <Prompt>Type the name</Prompt>
      <div className="mb-2 flex justify-center">
        <PlayerImage player={target} size={180} rounded="rounded-3xl" />
      </div>
      {teamHint && (
        <p className="mb-4 text-center text-sm text-[var(--muted)]">
          Hint: plays for {teamHint.name}
        </p>
      )}
      <input
        autoFocus
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) submit();
        }}
        placeholder="Player name…"
        className="mb-3 w-full select-text rounded-2xl border-2 border-[var(--hairline)] bg-transparent p-4 text-center text-lg font-bold"
      />
      <TapButton
        onPick={submit}
        disabled={disabled || !value.trim()}
        className="w-full rounded-2xl bg-[var(--ok-strong)] py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Check
      </TapButton>
    </div>
  );
}
