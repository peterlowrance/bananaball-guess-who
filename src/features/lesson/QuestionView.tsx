import { useState } from 'react';
import type { SessionQuestion } from '../../engine/quiz/types';
import { getPlayer, getTeam, teamByName, players as allPlayers } from '../../data/dataset';
import { PlayerImage } from '../shared/PlayerImage';
import { TeamLogo } from '../shared/TeamLogo';
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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border-2 p-4 text-center font-bold transition ${cls} ${anim}`}
    >
      {label}
    </button>
  );
}

function PhotoToName({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  return (
    <div>
      <Prompt>Who is this?</Prompt>
      <div className="mb-6 flex justify-center">
        <PlayerImage player={target} size={200} rounded="rounded-3xl" />
      </div>
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
  return (
    <div>
      <Prompt>{prompt}</Prompt>
      <div className="mb-6 flex justify-center">
        <PlayerImage player={target} size={200} rounded="rounded-3xl" />
      </div>
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
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => {
          const p = getPlayer(c.playerId);
          const st = choiceState(i, revealCorrect, pickedIndex);
          return (
            <button
              key={c.playerId + i}
              disabled={disabled}
              onClick={() => onAnswer({ correct: i === q.correctIndex, confusedWith: c.playerId })}
              className={`overflow-hidden rounded-2xl border-4 transition active:scale-[0.98] ${
                st === 'correct'
                  ? 'border-[var(--ok)]'
                  : st === 'wrong'
                    ? 'border-[var(--bad)]'
                    : st === 'dim'
                      ? 'border-transparent opacity-40'
                      : 'border-transparent'
              }`}
            >
              <PlayerImage player={p} size={150} rounded="rounded-none" className="w-full" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WhichTeam({ question: q, onAnswer, disabled, revealCorrect, pickedIndex }: Props) {
  const target = getPlayer(q.targetId);
  return (
    <div>
      <Prompt>What team is {target.name} on?</Prompt>
      <div className="mb-6 flex justify-center">
        <PlayerImage player={target} size={160} rounded="rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c, i) => {
          const team = getTeam(c.playerId);
          const st = choiceState(i, revealCorrect, pickedIndex);
          return (
            <button
              key={c.playerId + i}
              disabled={disabled}
              onClick={() => onAnswer({ correct: i === q.correctIndex })}
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
            </button>
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
            <button
              key={c.playerId + i}
              disabled={disabled}
              onClick={() => onAnswer({ correct: i === q.correctIndex, confusedWith: c.playerId })}
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
            </button>
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
  const inBank = tiles.map((_, i) => i).filter((i) => !slots.includes(i));
  const built = slots.map((i) => tiles[i]).join(' ');
  return (
    <div>
      <Prompt>Spell the name</Prompt>
      <div className="mb-4 flex justify-center">
        <PlayerImage player={target} size={160} rounded="rounded-3xl" />
      </div>
      <div className="mb-3 flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--hairline)] p-3">
        {slots.length === 0 && <span className="text-[var(--muted)]">tap tiles below</span>}
        {slots.map((tileIdx, pos) => (
          <button
            key={pos}
            disabled={disabled}
            onClick={() => setSlots((s) => s.filter((_, p) => p !== pos))}
            className="rounded-xl bg-[var(--team-soft)] px-3 py-2 font-bold transition active:scale-95"
          >
            {tiles[tileIdx]}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {inBank.map((i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => setSlots((s) => [...s, i])}
            className="rounded-xl border-2 border-[var(--hairline)] px-3 py-2 font-bold active:scale-95"
          >
            {tiles[i]}
          </button>
        ))}
      </div>
      <button
        onClick={() => onAnswer({ correct: built === q.answerText })}
        disabled={disabled || slots.length === 0}
        className="w-full rounded-2xl bg-[var(--ok-strong)] py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Check
      </button>
    </div>
  );
}

function BuildLetters({ question: q, onAnswer, disabled, prompt }: Props & { prompt: string }) {
  const target = getPlayer(q.targetId);
  const [slots, setSlots] = useState<number[]>([]);
  const tiles = q.tiles ?? [];
  const inBank = tiles.map((_, i) => i).filter((i) => !slots.includes(i));
  const built = slots.map((i) => tiles[i]).join('');
  const answer = (q.answerText ?? '').replace(/[^a-zA-Z]/g, '');
  const correct = built.toLowerCase() === answer.toLowerCase();
  return (
    <div>
      <Prompt>{prompt}</Prompt>
      <div className="mb-4 flex justify-center">
        <PlayerImage player={target} size={160} rounded="rounded-3xl" />
      </div>
      {/* assembled letters */}
      <div className="mb-3 flex min-h-14 flex-wrap items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[var(--hairline)] p-3">
        {slots.length === 0 && <span className="text-[var(--muted)]">tap letters below</span>}
        {slots.map((tileIdx, pos) => (
          <button
            key={pos}
            disabled={disabled}
            onClick={() => setSlots((s) => s.filter((_, p) => p !== pos))}
            className="h-10 w-9 rounded-lg bg-[var(--team-soft)] font-black transition active:scale-95"
          >
            {tiles[tileIdx]}
          </button>
        ))}
      </div>
      {/* letter bank */}
      <div className="mb-4 flex flex-wrap justify-center gap-1.5">
        {inBank.map((i) => (
          <button
            key={i}
            disabled={disabled}
            onClick={() => setSlots((s) => [...s, i])}
            className="h-10 w-9 rounded-lg border-2 border-[var(--hairline)] font-black transition active:scale-95"
          >
            {tiles[i]}
          </button>
        ))}
      </div>
      <button
        onClick={() => onAnswer({ correct })}
        disabled={disabled || slots.length === 0}
        className="w-full rounded-2xl bg-[var(--ok-strong)] py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Check
      </button>
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
        className="mb-3 w-full rounded-2xl border-2 border-[var(--hairline)] bg-transparent p-4 text-center text-lg font-bold"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="w-full rounded-2xl bg-[var(--ok-strong)] py-3 font-black text-white transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        Check
      </button>
    </div>
  );
}
