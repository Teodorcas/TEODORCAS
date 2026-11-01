import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // updateViaCache: 'none' stops the browser serving a stale sw.js out of
    // its HTTP cache, so a redeploy always reaches the worker.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
