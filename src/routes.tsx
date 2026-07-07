import { createHashRouter } from 'react-router-dom';
import { Layout } from './features/shared/Layout';
import { Placeholder } from './features/shared/Placeholder';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { PathScreen } from './features/path/PathScreen';
import { LessonScreen } from './features/lesson/LessonScreen';
import { LessonComplete } from './features/lesson/LessonComplete';
import { PracticeScreen } from './features/practice/PracticeScreen';
import { PracticeRun } from './features/practice/PracticeRun';

export const router = createHashRouter([
  // Lesson & practice players run full-screen, outside the tab layout.
  { path: '/lesson/:unitId', element: <LessonScreen /> },
  { path: '/lesson/:unitId/complete', element: <LessonComplete /> },
  { path: '/practice/run', element: <PracticeRun /> },
  { path: '/practice/complete', element: <LessonComplete /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <PathScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'roster', element: <Placeholder title="Roster" note="Your collection — Stage 8." /> },
      { path: 'profile', element: <Placeholder title="Profile" note="Stats & achievements — Stage 7." /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
]);
