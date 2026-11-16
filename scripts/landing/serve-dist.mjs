// Serve dist/ the way Vercel does: vercel.json redirects (with has/missing host, cookie and
// query conditions), then the edge middleware (middleware.ts, the real file, bundled with
// esbuild), then the file system, then every matching header rule, with gzip.
// Used by the QA audits, Lighthouse, the screenshots and the app capture tool.
//
//   node scripts/landing/serve-dist.mjs [port]      (default 4320)
//   import { serveDist } from './serve-dist.mjs'
//
// Open it as http://localhost:<port> in a browser (Chrome stores Secure cookies on
// localhost, so ?dev=true works as on fincalix.com). `asHost` makes host rules (www)
// evaluate for that host name.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};
const COMPRESS = /^(text\/|application\/(json|xml|manifest)|image\/svg)/;

const cookiesOf = (header = '') => Object.fromEntries(header.split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), c.slice(i + 1)]; }));

/** Vercel `has` / `missing` conditions (host, cookie, query). */
function conditionsMet(rule, ctx) {
    const hit = (c) => {
        const val = c.type === 'host' ? ctx.host : c.type === 'cookie' ? ctx.cookies[c.key] : c.type === 'query' ? ctx.query.get(c.key) : undefined;
        if (val === undefined || val === null) return false;
        return c.value === undefined || new RegExp(`^(?:${c.value})$`).test(val);
    };
    if (rule.has && !rule.has.every(hit)) return false;
    if (rule.missing && rule.missing.some(hit)) return false;
    return true;
}

async function loadMiddleware() {
    if (!fs.existsSync('middleware.ts')) return null;
    const out = buildSync({ entryPoints: ['middleware.ts'], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'error', mainFields: ['module', 'main'] });
    const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
    const matchers = (mod.config?.matcher || ['/(.*)']).map((m) => new RegExp('^' + m + '$'));
    return { run: mod.default, matches: (p) => matchers.some((re) => re.test(p)) };
}

export async function serveDist({ port = 4320, dir = 'dist', config = 'vercel.json', asHost, overrides = {}, forceDev = false } = {}) {
    const root = path.resolve(dir);
    const cfg = JSON.parse(fs.readFileSync(config, 'utf8'));
    const rx = (source) => new RegExp('^' + source + '$');
    const redirects = (cfg.redirects || []).map((r) => ({ ...r, re: rx(r.source), code: r.permanent ? 308 : 307 }));
    const rewrites = (cfg.rewrites || []).map((r) => ({ ...r, re: rx(r.source) }));
    const headers = (cfg.headers || []).map((h) => ({ ...h, re: rx(h.source) }));
    const middleware = await loadMiddleware();

    const fileFor = (p) => {
        const f = path.join(root, p);
        if (!f.startsWith(root)) return null;
        if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
        const idx = path.join(f, 'index.html');
        if (fs.existsSync(idx)) return idx;
        return null;
    };

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, 'http://local');
        let p = decodeURIComponent(url.pathname);
        const host = (asHost || req.headers.host || '').replace(/:\d+$/, '');
        // forceDev: behave as if the browser had the dev cookie (app audits, capture tool).
        const cookieHeader = forceDev ? `${req.headers.cookie ? req.headers.cookie + '; ' : ''}fincalix_dev=1` : (req.headers.cookie || '');
        const ctx = { host, cookies: cookiesOf(cookieHeader), query: url.searchParams };
        // 1. vercel.json redirects
        for (const r of redirects) {
            const m = p.match(r.re);
            if (m && conditionsMet(r, ctx)) {
                const to = r.destination.replace(/\$(\d)/g, (_, i) => m[Number(i)] || '') + (url.search && !r.destination.includes('?') ? url.search : '');
                res.writeHead(r.code, { Location: to }); res.end(); return;
            }
        }
        // 2. edge middleware
        const extra = {};
        if (middleware && middleware.matches(p)) {
            const r = await middleware.run(new Request(`https://${host || 'fincalix.com'}${req.url}`, { headers: { cookie: cookieHeader } }));
            const rewriteTo = r.headers.get('x-middleware-rewrite');
            for (const [k, v] of r.headers) if (!k.startsWith('x-middleware-')) extra[k] = v;
            if (!rewriteTo && !r.headers.get('x-middleware-next')) {
                res.writeHead(r.status, extra); res.end(); return;
            }
            if (rewriteTo) p = new URL(rewriteTo).pathname;
        }
        // 3. files, then rewrites
        let file = fileFor(p);
        if (!file) for (const r of rewrites) if (r.re.test(p) && conditionsMet(r, ctx)) { file = fileFor(r.destination); break; }
        if (!file && !overrides[p]) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
        const out = {};
        for (const h of headers) if (h.re.test(decodeURIComponent(url.pathname)) && conditionsMet(h, ctx)) for (const { key, value } of h.headers) out[key] = value;
        // Middleware headers win over vercel.json headers with the same name (any case).
        for (const [k, v] of Object.entries(extra)) { for (const o of Object.keys(out)) if (o.toLowerCase() === k.toLowerCase()) delete out[o]; out[k] = v; }
        const type = TYPES[path.extname(file || p).toLowerCase()] || 'application/octet-stream';
        out['Content-Type'] = type;
        let body = overrides[p] !== undefined ? Buffer.from(overrides[p]) : fs.readFileSync(file);
        if (COMPRESS.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); out['Content-Encoding'] = 'gzip'; out.Vary = 'Accept-Encoding'; }
        out['Content-Length'] = body.length;
        res.writeHead(200, out);
        res.end(req.method === 'HEAD' ? undefined : body);
    });
    // Dual-stack, so both http://127.0.0.1:<port> and http://localhost:<port> work.
    await new Promise((ok) => server.listen(port, ok));
    return { base: `http://127.0.0.1:${port}`, local: `http://localhost:${port}`, overrides, stop: () => new Promise((ok) => server.close(ok)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const s = await serveDist({ port: Number(process.argv[2]) || 4320 });
    console.log(`serving dist/ like Vercel at ${s.local}`);
}
