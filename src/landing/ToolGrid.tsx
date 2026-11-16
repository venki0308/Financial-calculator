import { useEffect, useId, useMemo, useState } from 'react';
import { allCalcs, appTools } from '../data/calculatorList';
import { SITE_CATEGORIES } from './categories';
import type { SiteCategory } from './categories';

/** What the grid needs per tool; names come from en.json at pre-render time. */
export interface GridTool {
    name: string;
    desc: string;
    path: string;
    cat: SiteCategory;
    color: string;
    keywords: string;
}

const ICONS = new Map([...allCalcs, ...appTools].map((c) => [c.path, c.icon]));

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]+/gu, ' ');

function matches(t: GridTool, words: string[]) {
    const hay = norm(`${t.name} ${t.desc} ${t.keywords}`);
    return words.every((w) => hay.includes(w));
}

function Card({ t }: { t: GridTool }) {
    const Icon = ICONS.get(t.path);
    return (
        <a className="tool" href={t.path} data-cta="open_app" data-cta-loc="tools">
            <span className="tool-head">
                <span className="tool-icon" style={{ ['--c' as string]: t.color }} aria-hidden="true">
                    {Icon ? <Icon size={20} strokeWidth={2} /> : null}
                </span>
                <span className="tool-name">{t.name}</span>
            </span>
            <span className="tool-desc">{t.desc}</span>
        </a>
    );
}

export function ToolGrid({ tools }: { tools: GridTool[] }) {
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState<SiteCategory | 'all'>('all');
    const [open, setOpen] = useState<ReadonlySet<SiteCategory>>(new Set());
    const searchId = useId();

    // Deep link from search engines: /?q=ppf (WebSite SearchAction).
    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) {
            setQuery(q.slice(0, 60));
            document.getElementById('tools')?.scrollIntoView({ block: 'start' });
        }
    }, []);

    const words = useMemo(() => norm(query).split(/\s+/).filter(Boolean), [query]);
    const visible = tools.filter((t) => (cat === 'all' || t.cat === cat) && (!words.length || matches(t, words)));
    const grouped = cat === 'all' && !words.length;

    return (
        <div className="grid-wrap">
            <div className="grid-controls">
                <div className="search">
                    <label htmlFor={searchId} className="sr-only">Search tools</label>
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    <input id={searchId} type="search" placeholder="Search EMI, PPF, HRA, gratuity…" value={query}
                        onChange={(e) => setQuery(e.target.value)} autoComplete="off" enterKeyHint="search" />
                </div>
                <div className="chips" role="group" aria-label="Filter by category">
                    <button type="button" className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
                    {SITE_CATEGORIES.map((c) => (
                        <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
                    ))}
                </div>
            </div>
            <p className="grid-count" aria-live="polite">
                {visible.length === tools.length ? `${tools.length} tools` : `${visible.length} of ${tools.length} tools`}
            </p>
            <div className="grid-body">
                {visible.length === 0 && <p className="grid-empty">No tool matches “{query}”. Try EMI, PPF or HRA.</p>}
                {grouped
                    ? SITE_CATEGORIES.map((c) => {
                        const list = visible.filter((t) => t.cat === c.id);
                        if (!list.length) return null;
                        return (
                            <section key={c.id} className={`cat${open.has(c.id) ? ' open' : ''}`} aria-labelledby={`cat-${c.id}`}>
                                <h3 id={`cat-${c.id}`} className="cat-title"><span className="serif">{c.label}</span><small>{list.length} tools</small></h3>
                                <div className="tools">{list.map((t) => <Card key={t.path} t={t} />)}</div>
                                {list.length > 4 && (
                                    <button type="button" className="cat-more" aria-expanded={open.has(c.id)}
                                        onClick={() => setOpen((s) => new Set([...s, c.id]))}>
                                        Show all {list.length} {c.label} tools
                                    </button>
                                )}
                            </section>
                        );
                    })
                    : <div className="tools">{visible.map((t) => <Card key={t.path} t={t} />)}</div>}
            </div>
        </div>
    );
}
