import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { store } from './store'
import './index.css'
import App from './App.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// A tab opened before a deploy can ask for page files that the new version
// replaced. Vite reports that here; reload once to pick up the new version
// instead of showing an error. A successful load clears the guard.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('reloaded-for-new-version')) return;
    sessionStorage.setItem('reloaded-for-new-version', String(Date.now()));
  } catch { /* storage unavailable: still reload */ }
  event.preventDefault();
  window.location.reload();
});
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('reloaded-for-new-version'); } catch { /* ignore */ } }, 10000);
});

// Free-tier backends sleep when idle. Nudge it awake while the visitor is still
// looking at the page so the first real request is not the slow one.
const backendOrigin = import.meta.env.VITE_SOCKET_URL;
if (import.meta.env.PROD && backendOrigin) {
  fetch(`${backendOrigin}/api/v1/health`, { mode: 'no-cors' }).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
