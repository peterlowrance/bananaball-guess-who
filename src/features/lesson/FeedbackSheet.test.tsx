import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeedbackSheet } from './FeedbackSheet';
import { players } from '../../data/dataset';

const player = players[0];

afterEach(cleanup);

describe('FeedbackSheet full-name reveal', () => {
  it('reveals the full name on a WRONG answer', () => {
    render(<FeedbackSheet correct={false} player={player} onContinue={() => {}} />);
    expect(screen.getAllByText(player.name).length).toBeGreaterThan(0);
  });

  it('does NOT reveal the name on a correct whole-name question', () => {
    render(
      <FeedbackSheet correct player={player} questionType="photo-to-name" onContinue={() => {}} />,
    );
    expect(screen.queryByText(player.name)).toBeNull();
  });

  it.each(['first-name', 'last-name', 'build-first', 'build-last'] as const)(
    'reveals the full name even when correct for a partial-name question: %s',
    (type) => {
      render(
        <FeedbackSheet correct player={player} questionType={type} onContinue={() => {}} />,
      );
      // The full name is shown so the learner picks up the whole thing.
      expect(screen.getAllByText(player.name).length).toBeGreaterThan(0);
    },
  );
});
