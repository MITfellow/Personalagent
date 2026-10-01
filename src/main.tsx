import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerServiceWorker } from './lib/sw';
import { watchInstallability } from './lib/install';

// the install event fires once, early, and is the only handle on the dialog —
// so it has to be caught before React even mounts
watchInstallability();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

registerServiceWorker(() => {
  window.dispatchEvent(new CustomEvent('app-update-ready'));
});
