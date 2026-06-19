import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initAuthStore } from '../../domains/auth/store';
import '../../styles/index.css';

// Hydrate the shared auth store so history + caching see the signed-in user.
// The store notifies subscribers (useHistory, useWordOfDay) once the session
// resolves, so we don't need to block the first paint on it.
initAuthStore().catch((err) =>
  console.error('[french] auth init failed:', err)
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
