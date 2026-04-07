import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: '/',
    server: {
        host: true,
    },
    build: {
        chunkSizeWarningLimit: 800,
        rollupOptions: {
            output: {
                // Split heavy vendor libraries into their own chunks so they
                // are loaded only when needed (and cached separately on CDN).
                manualChunks: (id) => {
                    // Each locale JSON gets its own chunk so the user only
                    // downloads the language they pick. en.json is bundled
                    // with the app shell as the default fallback.
                    const localeMatch = id.match(/\/locales\/(\w+)\.json$/);
                    if (localeMatch) {
                        return `locale-${localeMatch[1]}`;
                    }
                    if (!id.includes('node_modules')) return undefined;

                    // Firebase (~700KB) — analytics, crashlytics, app
                    if (id.includes('firebase') || id.includes('@capacitor-firebase')) {
                        return 'vendor-firebase';
                    }
                    // PDF generation libs (~330KB) — only loaded on export action
                    if (id.includes('jspdf') || id.includes('html2canvas')) {
                        return 'vendor-pdf';
                    }
                    // Excel export (~430KB) — only loaded on export action
                    if (id.includes('/xlsx/') || id.endsWith('/xlsx')) {
                        return 'vendor-xlsx';
                    }
                    // Charts (~250KB)
                    if (id.includes('chart.js') || id.includes('react-chartjs')) {
                        return 'vendor-charts';
                    }
                    // Animations (~120KB)
                    if (id.includes('framer-motion')) {
                        return 'vendor-motion';
                    }
                    // i18n (~250KB with all locales)
                    if (id.includes('i18next') || id.includes('react-i18next')) {
                        return 'vendor-i18n';
                    }
                    // React core
                    if (id.includes('react-dom') || id.includes('react-router')) {
                        return 'vendor-react';
                    }
                    // Capacitor plugins
                    if (id.includes('@capacitor/')) {
                        return 'vendor-capacitor';
                    }
                    // All other node_modules → generic vendor chunk
                    return 'vendor-misc';
                },
            },
        },
    },
})
