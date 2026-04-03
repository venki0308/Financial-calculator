import './i18n';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Global handler: catch chunk loading failures that escape React error boundaries
window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    const isChunkError = msg.includes('dynamically imported module')
        || msg.includes('Failed to fetch')
        || msg.includes('ChunkLoadError')
        || msg.includes('Loading chunk');
    if (isChunkError) {
        event.preventDefault(); // suppress console noise
        const reloadKey = 'fncx_chunk_reload';
        if (!sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, '1');
            window.location.reload();
        }
    }
});

// Clear the reload flag on successful load
sessionStorage.removeItem('fncx_chunk_reload');

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
