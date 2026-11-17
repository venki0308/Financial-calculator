/**
 * Header, footer and the Google Play call to action shared by every website page
 * (home, category pages, /calculators, /schemes, scheme pages, /in-the-app, 404,
 * /export-my-data). Server-rendered; the only interactive part is the theme switch.
 */
import type { ReactNode } from 'react';
import { Island } from './islands';
import { playUrl } from './play';
import type { Placement } from './play';
import { SUPPORT_EMAIL } from './content';
import badgeUrl from './assets/google-play-badge-en.png';
import iconUrl from './assets/fincalix-icon-96.webp';

export interface FooterGroup { id: string; label: string; links: Array<{ href: string; label: string }> }

/** The official Google Play badge (unaltered artwork), with an install referrer per placement. */
export function PlayBadge({ placement, small, campaign }: { placement: Exclude<Placement, 'qr'>; small?: boolean; campaign?: string }) {
    return (
        <a className={`play${small ? ' play-sm' : ''}`} href={playUrl(placement, campaign)} data-play={placement} target="_blank" rel="noopener">
            <img src={badgeUrl} width={646} height={250} alt="Get it on Google Play" />
        </a>
    );
}

/**
 * Play badge with its note line. On an iPhone or iPad (class set before first paint by
 * the head script, so nothing moves) the note says there is no iPhone app yet. `qrSvg`
 * adds a QR code to the Play listing, shown on desktop only.
 */
export function PlayCta({ placement, note = 'Free on Google Play for Android', qrSvg, campaign }: { placement: 'hero' | 'final_cta' | 'mini_calc'; note?: string; qrSvg?: string; campaign?: string }) {
    return (
        <div className="ctas">
            <PlayBadge placement={placement} campaign={campaign} />
            <span className="cta-note">
                <span className="note-default">{note}</span>
                <span className="note-ios">Android only for now — there’s no iPhone app yet.</span>
            </span>
            {qrSvg && (
                <figure className="qr" aria-label="QR code: scan with your Android phone to open FinCalix on Google Play">
                    <span className="qr-code" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    <figcaption>Scan with your Android phone</figcaption>
                </figure>
            )}
        </div>
    );
}

export interface NavLink { href: string; label: string }
export const PAGE_NAV: NavLink[] = [
    { href: '/calculators', label: 'Calculators' },
    { href: '/income-tax', label: 'Tax 2026-27' },
    { href: '/schemes', label: 'Schemes' },
    { href: '/privacy-policy', label: 'Privacy' },
];

export function SiteHeader({ nav = PAGE_NAV }: { nav?: NavLink[] }) {
    return (
        <>
            <a className="skip" href="#main">Skip to content</a>
            <header className="hdr">
                <div className="wrap nav">
                    <a className="logo" href="/" aria-label="FinCalix home">
                        <img src={iconUrl} width={34} height={34} alt="" />
                        <span>FinCalix</span>
                    </a>
                    <nav className="nav-links" aria-label="Sections">
                        {nav.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
                    </nav>
                    <div className="nav-right">
                        <Island name="header" props={{ tools: [] }} />
                        <PlayBadge placement="header" small />
                    </div>
                </div>
            </header>
        </>
    );
}

export function SiteFooter({ groups }: { groups: FooterGroup[] }) {
    return (
        <footer className="ftr">
            <div className="wrap">
                <div className="fgrid">
                    <div className="fbrand">
                        <a className="logo" href="/" aria-label="FinCalix home"><img src={iconUrl} width={34} height={34} alt="" /><span>FinCalix</span></a>
                        <p>Free money calculators for India.</p>
                        <p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
                    </div>
                    {groups.map((c) => (
                        <nav key={c.id} aria-labelledby={`f-${c.id}`}>
                            <h3 id={`f-${c.id}`}>{c.label}</h3>
                            <ul>{c.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
                        </nav>
                    ))}
                    <nav aria-labelledby="f-site">
                        <h3 id="f-site">FinCalix</h3>
                        <ul>
                            <li><a href="/calculators">All calculators</a></li>
                            <li><a href="/schemes">Government schemes</a></li>
                            <li><a href="/how-we-calculate">How we calculate</a></li>
                            <li><a href="/updates">Updates</a></li>
                            <li><a href="/export-my-data">Export my data</a></li>
                        </ul>
                    </nav>
                    <nav aria-labelledby="f-legal">
                        <h3 id="f-legal">Legal</h3>
                        <ul>
                            <li><a href="/privacy-policy">Privacy policy</a></li>
                            <li><a href="/data-privacy">Data privacy</a></li>
                            <li><a href="/data-safety">Data safety</a></li>
                            <li><a href="/terms-of-service">Terms of service</a></li>
                            <li><a href="/about">About</a></li>
                        </ul>
                    </nav>
                </div>
                <div className="legal">
                    <span>© {new Date().getFullYear()} FinCalix · Made in India</span>
                    <span>Calculators give estimates for planning, not financial advice.</span>
                </div>
            </div>
        </footer>
    );
}

/** The final call-to-action band (the page's second and last gradient). */
export function CtaBand({ title, children, campaign }: { title: ReactNode; children?: ReactNode; campaign?: string }) {
    return (
        <section className="band" aria-labelledby="band-h">
            <div className="wrap">
                <h2 id="band-h" className="serif">{title}</h2>
                {children ?? <p className="band-sub">Free on Google Play. No login, no ads.</p>}
                <PlayCta placement="final_cta" campaign={campaign} />
            </div>
        </section>
    );
}
