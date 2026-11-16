// Serve dist/ the way Vercel does, using the rules in vercel.json: redirects (except
// the www host rule), files first, then the catch-all rewrite, then every matching
// header rule, with gzip. Used by the QA audits, Lighthouse and the screenshots.
//
//   node scripts/landing/serve-dist.mjs [port]      (default 4320)
//   import { serveDist } from './serve-dist.mjs'
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};
const COMPRESS = /^(text\/|application\/(json|xml|manifest)|image\/svg)/;

export async function serveDist({ port = 4320, dir = 'dist', config = 'vercel.json' } = {}) {
    const root = path.resolve(dir);
    const cfg = JSON.parse(fs.readFileSync(config, 'utf8'));
    const rx = (source) => new RegExp('^' + source + '$');
    const redirects = (cfg.redirects || []).filter((r) => !r.has).map((r) => ({ re: rx(r.source), to: r.destination, code: r.permanent ? 308 : 307 }));
    const rewrites = (cfg.rewrites || []).map((r) => ({ re: rx(r.source), to: r.destination }));
    const headers = (cfg.headers || []).map((h) => ({ re: rx(h.source), headers: h.headers }));

    const fileFor = (p) => {
        const f = path.join(root, p);
        if (!f.startsWith(root)) return null;
        if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
        const idx = path.join(f, 'index.html');
        if (fs.existsSync(idx)) return idx;
        return null;
    };

    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://local');
        const p = decodeURIComponent(url.pathname);
        for (const r of redirects) if (r.re.test(p)) { res.writeHead(r.code, { Location: r.to }); res.end(); return; }
        let file = fileFor(p);
        if (!file) for (const r of rewrites) if (r.re.test(p)) { file = fileFor(r.to); break; }
        if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
        const out = {};
        for (const h of headers) if (h.re.test(p)) for (const { key, value } of h.headers) out[key] = value;
        const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
        out['Content-Type'] = type;
        let body = fs.readFileSync(file);
        if (COMPRESS.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); out['Content-Encoding'] = 'gzip'; out.Vary = 'Accept-Encoding'; }
        out['Content-Length'] = body.length;
        res.writeHead(200, out);
        res.end(req.method === 'HEAD' ? undefined : body);
    });
    await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
    return { base: `http://127.0.0.1:${port}`, stop: () => new Promise((ok) => server.close(ok)) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const s = await serveDist({ port: Number(process.argv[2]) || 4320 });
    console.log(`serving dist/ like Vercel at ${s.base}`);
}
