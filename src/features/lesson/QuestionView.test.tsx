import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QuestionView } from './QuestionView';
import { players, playersByTeamId } from '../../data/dataset';
import type { SessionQuestion } from '../../engine/quiz/types';

afterEach(cleanup);

// A which-team question about the first team's first player, with three other
// teams' players as distractors (choices carry a playerId whose team is used).
function whichTeamQuestion(): SessionQuestion {
  const teams = [...playersByTeamId.values()];
  const target = teams[0][0];
  // For which-team, each choice carries a *team_id* in the playerId slot.
  const choices = teams.slice(0, 4).map((t) => ({ playerId: t[0].team_id, label: t[0].team_name }));
  return {
    id: 'q1',
    type: 'which-team',
    targetId: target.player_id,
    choices,
    correctIndex: 0,
    isReview: true,
    intro: false,
  };
}

describe('WhichTeam question', () => {
  it('does not show the player photo (which would give away the team)', () => {
    const q = whichTeamQuestion();
    const target = players.find((p) => p.player_id === q.targetId)!;
    render(
      <QuestionView question={q} onAnswer={() => {}} disabled={false} revealCorrect={null} pickedIndex={null} />,
    );
    // The target's headshot <img src=image_url> must NOT be rendered.
    const photo = screen.queryByAltText(target.name);
    // Only allow the InitialsAvatar fallback (a div with aria-label), never an
    // <img> pointing at the player's headshot URL.
    if (photo) {
      expect(photo.tagName).not.toBe('IMG');
    } else {
      expect(photo).toBeNull();
    }
  });

  it('shows the player name plus jersey number and position as text cues', () => {
    const q = whichTeamQuestion();
    const target = players.find((p) => p.player_id === q.targetId)!;
    render(
      <QuestionView question={q} onAnswer={() => {}} disabled={false} revealCorrect={null} pickedIndex={null} />,
    );
    // Name appears in the prompt and the identity card.
    expect(screen.getAllByText(target.name).length).toBeGreaterThan(0);
    // Number + position line.
    expect(
      screen.getByText(`#${target.jersey_number} · ${target.position_label}`),
    ).toBeTruthy();
  });
});
