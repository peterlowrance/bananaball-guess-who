import { createHashRouter } from 'react-router-dom';
import { Layout } from './features/shared/Layout';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { PathScreen } from './features/path/PathScreen';
import { LessonScreen } from './features/lesson/LessonScreen';
import { LessonComplete } from './features/lesson/LessonComplete';
import { PracticeScreen } from './features/practice/PracticeScreen';
import { PracticeRun } from './features/practice/PracticeRun';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { RosterScreen } from './features/roster/RosterScreen';
import { PlayerCard } from './features/roster/PlayerCard';
import { Onboarding, RequireOnboarding } from './features/onboarding/Onboarding';

export const router = createHashRouter([
  { path: '/onboarding', element: <Onboarding /> },
  // Lesson & practice players run full-screen, outside the tab layout.
  { path: '/lesson/:unitId', element: <LessonScreen /> },
  { path: '/lesson/:unitId/complete', element: <LessonComplete /> },
  { path: '/practice/run', element: <PracticeRun /> },
  { path: '/practice/complete', element: <LessonComplete /> },
  { path: '/roster/:slug', element: <PlayerCard /> },
  {
    path: '/',
    element: (
      <RequireOnboarding>
        <Layout />
      </RequireOnboarding>
    ),
    children: [
      { index: true, element: <PathScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'roster', element: <RosterScreen /> },
      { path: 'profile', element: <ProfileScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
]);
