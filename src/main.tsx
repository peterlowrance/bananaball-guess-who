import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/index.css';
import App from './App.tsx';

// Prompt-based update: reload when the user accepts a new version.
registerSW({
  onNeedRefresh() {
    if (confirm('A new version of Bananaball Guess Who is available. Reload?')) {
      window.location.reload();
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
