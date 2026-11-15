import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Without this the offline cache serves the previous version on the first visit
// after a deploy. With it, the page reloads once as soon as the new version is
// installed, so a shared link always shows the latest build.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
