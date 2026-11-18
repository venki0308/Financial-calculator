/**
 * Layout and building blocks of a feature page (SEO_PLAN.md §7). Server-rendered; the only
 * interactive parts are the header's theme switch and the calculator island.
 */
import type { ReactNode } from 'react';
import en from '../../locales/en.json';
import { CtaBand, SiteFooter, SiteHeader } from '../SiteChrome';
import type { FooterGroup } from '../SiteChrome';
import { longDate } from '../site-data';
import { ORIGIN } from '../seoRoutes';
import { getCalc } from './calcs/resolve';
import type { DisclaimerKey, FeatureDef, Faq } from './types';
import { NOT_GOVT_NOTICE_EN, WEBSITE_PAGE_SOURCES, hostOf } from '../../data/officialSources';

/**
 * "FinCalix is not a government app …" with the official link(s), under the heading of scheme
 * pages and of guides built on government rules (same text as the app's `sources.notGovt`).
 */
export function GovtNoticeWeb({ label, links }: { label: string; links: ReadonlyArray<{ name: string; url: string }> }) {
    return (
        <p className="govt-notice" data-govt-notice="">
            <strong>{NOT_GOVT_NOTICE_EN}</strong>{' '}
            {label}:{' '}
            {links.map((l, i) => (
                <span key={l.url}>{i > 0 && ' · '}<a href={l.url} target="_blank" rel="noopener external" data-official-link={l.url}>{l.name} ({hostOf(l.url)}) <span aria-hidden="true">↗</span></a></span>
            ))}
        </p>
    );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A titled section of the page body. */
export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
    const hid = `s-${id ?? slug(title)}`;
    return (
        <section className="fsec" aria-labelledby={hid}>
            <h2 id={hid} className="serif">{title}</h2>
            {children}
        </section>
    );
}

/** A data table in its own horizontal scroll area (no sideways page scroll at 360 px). */
export function DataTable({ caption, head, rows, note }: { caption: string; head: string[]; rows: ReactNode[][]; note?: ReactNode }) {
    return (
        <figure className="ftable-fig">
            <div className="table-scroll" role="region" tabIndex={0} aria-label={caption}>
                <table className="ftable">
                    <caption>{caption}</caption>
                    <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {note && <figcaption className="fnote">{note}</figcaption>}
        </figure>
    );
}

/** Worked scenarios: each a short heading and a plain explanation with real numbers. */
export function Scenarios({ items }: { items: Array<{ title: string; body: ReactNode }> }) {
    return (
        <ol className="scenarios list-reset">
            {items.map((s) => (
                <li key={s.title}>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                </li>
            ))}
        </ol>
    );
}

/** Rules and limits, each with its official source. */
export function Rules({ items, checked }: { items: Array<{ text: ReactNode; source?: { label: string; url: string } }>; checked: string }) {
    return (
        <aside className="rules" aria-labelledby="rules-h">
            <h2 id="rules-h" className="serif">Rules and limits</h2>
            <ul>
                {items.map((r, i) => (
                    <li key={i}>
                        {r.text}
                        {r.source && <> <a className="src" href={r.source.url} target="_blank" rel="noopener">{r.source.label}</a></>}
                    </li>
                ))}
            </ul>
            <p className="checked">Checked against the official sources on {longDate(checked)}.</p>
        </aside>
    );
}

/** FAQPage JSON-LD for the page head (same questions and answers as on the page). */
export function faqLd(f: FeatureDef): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: f.faqs.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })),
        url: `${ORIGIN}/${f.slug}`,
    };
}

function FaqList({ faqs }: { faqs: Faq[] }) {
    return (
        <section className="faq fsec" aria-labelledby="faq-h">
            <h2 id="faq-h" className="serif">Questions people ask</h2>
            {faqs.map((q) => (
                <details key={q.q}>
                    <summary>{q.q}</summary>
                    <p>{q.a}</p>
                </details>
            ))}
        </section>
    );
}

const APP_DISCLAIMERS = (en as unknown as { disclaimer: Record<string, { text?: string } | string> }).disclaimer;
function appText(key: string): string {
    const v = APP_DISCLAIMERS[key];
    const text = typeof v === 'object' && v ? v.text : undefined;
    if (!text) throw new Error(`feature page: disclaimer.${key}.text missing in en.json`);
    return text;
}
/** Page disclaimers. SIP and SSY are the app's own texts; the rest are written for the website. */
const DISCLAIMER_TEXT: Record<DisclaimerKey, () => string> = {
    tax: () => 'Tax figures are estimates for a resident salaried individual below 60, using the slabs, rebate, surcharge and cess for FY 2026-27 (tax year 2026-27 under the Income-tax Act, 2025). Deductions must be supported by proof. Your employer and the Income Tax Department compute the final tax. FinCalix is not a tax advisor; consult a Chartered Accountant for your return.',
    invest: () => appText('sip'),
    ssy: () => appText('ssy'),
    loan: () => 'Loan figures use the standard reducing-balance method on the inputs you enter. Your lender’s statement, rate resets, fees and charges decide the actual amounts. FinCalix is not a bank, NBFC or lender.',
    deposit: () => 'Interest rates on Post Office schemes are set by the Government every quarter; a time deposit keeps the rate it was opened at. Figures are estimates before tax. FinCalix is not affiliated with India Post or any bank.',
    card: () => 'Interest figures use the daily-balance method with 18% GST on finance charges. Your card issuer’s Most Important Terms and Conditions (MITC) and statement decide the actual charges. FinCalix is not affiliated with any bank or card issuer.',
    gold: () => 'Gold loan figures are estimates. Lenders value pledged gold themselves, at the lower of the 30-day average or the previous day’s price for its purity, and may lend less than the RBI limit. FinCalix is not a lender, and this is not a loan offer.',
};

export function FeatureView({ f, footer, catLabel, catPath }: { f: FeatureDef; footer: FooterGroup[]; catLabel: string; catPath: string }) {
    const Calc = f.calc ? getCalc(f.calc.key) : null;
    const calcProps = f.calc ? { ...f.calc.props, campaign: f.slug } : null;
    return (
        <>
            <SiteHeader />
            <main id="main" className="page fpage">
                <div className="wrap">
                    <nav className="crumbs" aria-label="Breadcrumb">
                        <ol>
                            <li><a href="/">Home</a></li>
                            <li><a href="/calculators">Calculators</a></li>
                            <li><a href={catPath}>{catLabel}</a></li>
                            <li><span aria-current="page">{f.crumb}</span></li>
                        </ol>
                    </nav>
                    <header className="page-head fhead">
                        <p className="eyebrow">{f.eyebrow}</p>
                        <h1 className="serif">{f.h1}</h1>
                        {WEBSITE_PAGE_SOURCES[f.slug] && <GovtNoticeWeb label="Official source" links={WEBSITE_PAGE_SOURCES[f.slug]} />}
                        <div className="answer">{f.answer}</div>
                        <p className="updated">
                            Last updated {longDate(f.updated)} · Sources:{' '}
                            {f.sources.map((s, i) => (
                                <span key={s.url}>{i > 0 && ', '}<a href={s.url} target="_blank" rel="noopener">{s.label}</a></span>
                            ))}
                        </p>
                    </header>
                    {Calc && calcProps && (
                        <div className="fcalc-wrap" data-calc={f.calc!.key} data-props={JSON.stringify(calcProps)}>
                            <Calc {...calcProps} />
                        </div>
                    )}
                    <f.Body />
                    <FaqList faqs={f.faqs} />
                    <nav className="related fsec" aria-labelledby="rel-h">
                        <h2 id="rel-h" className="serif">Related tools</h2>
                        <ul className="list-reset">
                            {f.related.map((r) => (
                                <li key={r.href}><a href={r.href}>{r.label}</a><span>{r.note}</span></li>
                            ))}
                            <li><a href={catPath}>All {catLabel.toLowerCase()} tools</a><span>Every calculator in this category</span></li>
                        </ul>
                    </nav>
                    <aside className="disclaimer" aria-label="Disclaimer">
                        <p><strong>Disclaimer.</strong> {typeof f.disclaimer === 'string' ? DISCLAIMER_TEXT[f.disclaimer]() : f.disclaimer.text}</p>
                        <p>{appText('general')}</p>
                    </aside>
                </div>
                <CtaBand campaign={f.slug} title={<>Save it, track it,<br />get reminded.</>}>
                    <p className="band-sub">The same calculator in the free FinCalix app, with history, reminders and no login.</p>
                </CtaBand>
            </main>
            <SiteFooter groups={footer} />
        </>
    );
}
