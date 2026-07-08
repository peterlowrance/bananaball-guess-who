import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import App from './App.tsx';
import { unlockAudio } from './lib/sound';

// Unlock the AudioContext on the first user gesture (required by iOS Safari).
const unlock = () => {
  unlockAudio();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// Prompt-based update: when a new SW is waiting, offer to activate+reload.
// updateSW(true) performs the reload itself — never call location.reload too.
// Prompt only ONCE per page load: onNeedRefresh can fire repeatedly while a SW
// sits waiting, and re-prompting on every check produced an inescapable
// "new version available?" loop when the user declined. If they decline, we
// leave it alone until the next natural page load.
let updatePrompted = false;
const updateSW = registerSW({
  onNeedRefresh() {
    if (updatePrompted) return;
    updatePrompted = true;
    if (confirm('A new version of Bananaball Guess Who is available. Reload?')) {
      void updateSW(true);
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
