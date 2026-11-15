import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { store } from './store'
import './index.css'
import App from './App.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

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
