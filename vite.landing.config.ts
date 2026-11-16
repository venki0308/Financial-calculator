/**
 * Build for the website at "/" (landing.html → pre-rendered dist/index.html).
 * Separate from the app's vite.config.ts so the website's bundle shares no
 * chunk with the app, and so the Android build (npm run build) is unchanged.
 *
 *   npm run build:landing   client build → SSR build → scripts/landing/prerender.mjs
 *   npm run build:web       app + website (what Vercel runs)
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
    plugins: [react()],
    base: '/',
    // Website-only static files (OG image, brand icon). Not in the app's public/.
    publicDir: isSsrBuild ? false : 'src/landing/public',
    esbuild: { drop: ['console', 'debugger'] },
    build: isSsrBuild
        ? {
            outDir: '.landing-ssr',
            emptyOutDir: true,
            assetsDir: 'site',
            // Screenshots, badge and icon are referenced only by server-rendered markup;
            // emit them here and prerender.mjs copies them into dist/site/.
            ssrEmitAssets: true,
            assetsInlineLimit: 0,
            rollupOptions: { input: 'src/landing/entry-server.tsx' },
        }
        : {
            outDir: 'dist',
            emptyOutDir: false,          // the app build is already in dist/
            assetsDir: 'site',           // website files live under /site/, app files under /assets/
            sourcemap: false,
            minify: 'terser',
            modulePreload: { polyfill: false },
            assetsInlineLimit: 0,        // keep fonts and images as cacheable files
            // The website, the 4 web legal pages and /data-safety (pre-rendered by prerender.mjs).
            rollupOptions: {
                input: { landing: 'landing.html', legal: 'legal.html', datasafety: 'datasafety.html' },
                // React is shared by all three pages: give the chunk a clear name.
                output: { manualChunks: (id) => (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id) ? 'react' : undefined) },
            },
        },
}));
