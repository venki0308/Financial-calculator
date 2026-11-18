/**
 * The generated website pages, pre-rendered to static HTML (scripts/landing/prerender.mjs):
 * category pages, /calculators, /schemes, /schemes/<id>, /in-the-app, the 404 page and
 * /export-my-data. Server-rendered only; the shared header/footer come from SiteChrome.
 */
import type { ReactNode } from 'react';
import { CtaBand, SiteFooter, SiteHeader } from './SiteChrome';
import type { FooterGroup } from './SiteChrome';
import type { CategoryPage, SchemePage } from './site-data';
import { firstSentence, longDate, schemeHref, schemesByCategory } from './site-data';
import { CALCULATORS_INTRO, IMPORT_STEPS, PUBLISHER, SCHEMES_INTRO, SUPPORT_EMAIL } from './content';
import { METHODS, PROCESS, UPDATES } from './trust-content';
import { TOOL_BLURBS } from './tool-blurbs';
import { EXPORT_PAGE, ORIGIN } from './seoRoutes';
import { DataTable, GovtNoticeWeb } from './features/ui';
import { SCHEME_PORTAL } from '../data/officialSources';
import type { ToolCard } from './data';

interface Crumb { href?: string; label: string }

function Page({ crumbs, footer, children, band = true }: { crumbs: Crumb[]; footer: FooterGroup[]; children: ReactNode; band?: boolean }) {
    return (
        <>
            <SiteHeader />
            <main id="main" className="page">
                <div className="wrap">
                    <nav className="crumbs" aria-label="Breadcrumb">
                        <ol>
                            {crumbs.map((c, i) => (
                                <li key={i}>{c.href && i < crumbs.length - 1 ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}</li>
                            ))}
                        </ol>
                    </nav>
                    {children}
                </div>
                {band && <CtaBand title={<>Every money decision,<br />worked out in seconds.</>} />}
            </main>
            <SiteFooter groups={footer} />
        </>
    );
}

function ToolItem({ t, guide }: { t: ToolCard; guide: string | null }) {
    const inner = (
        <>
            <span className="tool-head"><span className="tool-name">{t.name}</span></span>
            <span className="tool-desc">{TOOL_BLURBS[t.path] ?? t.desc}</span>
            <span className="tool-guide">{guide ? 'Calculator and guide →' : 'In the app'}</span>
        </>
    );
    return <li>{guide ? <a className="tool tool-link" href={guide}>{inner}</a> : <div className="tool">{inner}</div>}</li>;
}

export function CategoryView({ page, all, footer }: { page: CategoryPage; all: CategoryPage[]; footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { href: '/calculators', label: 'Calculators' }, { label: page.label }]}>
            <header className="page-head">
                <p className="eyebrow">{page.tools.length} tools in the FinCalix app</p>
                <h1 className="serif">{page.title}</h1>
                <p className="lead">{page.intro}</p>
                <p>{page.more}</p>
            </header>
            <ul className="tools list-reset">
                {page.tools.map((t) => <ToolItem key={t.path} t={t} guide={t.guide} />)}
            </ul>
            <nav className="other-cats" aria-labelledby="other-h">
                <h2 id="other-h" className="serif">Other categories</h2>
                <ul className="chips list-reset">
                    {all.filter((c) => c.key !== page.key).map((c) => <li key={c.key}><a className="chip" href={c.path}>{c.label}</a></li>)}
                </ul>
            </nav>
        </Page>
    );
}

export function CalculatorsView({ pages, calculatorCount, toolCount, footer }: { pages: CategoryPage[]; calculatorCount: number; toolCount: number; footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'Calculators' }]}>
            <header className="page-head">
                <p className="eyebrow">{calculatorCount} calculators · {toolCount - calculatorCount} trackers and planners</p>
                <h1 className="serif">All FinCalix calculators</h1>
                <p className="lead">{CALCULATORS_INTRO}</p>
            </header>
            {pages.map((c) => (
                <section key={c.key} className="cat" aria-labelledby={`cat-${c.key}`}>
                    <h2 id={`cat-${c.key}`} className="cat-title"><a className="serif" href={c.path}>{c.label}</a><small>{c.tools.length} tools</small></h2>
                    <ul className="tools list-reset">{c.tools.map((t) => <ToolItem key={t.path} t={t} guide={t.guide} />)}</ul>
                </section>
            ))}
        </Page>
    );
}

export function SchemesView({ count, footer }: { count: number; footer: FooterGroup[] }) {
    const groups = schemesByCategory();
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'Government schemes' }]}>
            <header className="page-head">
                <p className="eyebrow">{count} central schemes</p>
                <h1 className="serif">Government schemes, explained simply</h1>
                <GovtNoticeWeb label="Official scheme portal" links={[SCHEME_PORTAL]} />
                <p className="lead">{SCHEMES_INTRO}</p>
            </header>
            {groups.map((g) => (
                <section key={g.category} className="cat" aria-labelledby={`sc-${g.category.replace(/\W+/g, '-')}`}>
                    <h2 id={`sc-${g.category.replace(/\W+/g, '-')}`} className="cat-title"><span className="serif">{g.category}</span><small>{g.items.length} schemes</small></h2>
                    <ul className="schemes list-reset">
                        {g.items.map((s) => (
                            <li key={s.id}>
                                <a className="scheme scheme-link" href={schemeHref(s.id)}>
                                    <span className="scheme-name serif">{s.name}</span>
                                    <span className="scheme-desc">{firstSentence(s.description)}</span>
                                    {(s.interestRate || s.benefitAmount) && <span className="scheme-fig num">{s.interestRate || s.benefitAmount}</span>}
                                    {s.lastVerified && <span className="scheme-ver">Last verified {longDate(s.lastVerified)}</span>}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </Page>
    );
}

function List({ title, items }: { title: string; items: string[] }) {
    if (!items.length) return null;
    return (
        <section className="prose-sec">
            <h2 className="serif">{title}</h2>
            <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
    );
}

export function SchemeView({ page, footer }: { page: SchemePage; footer: FooterGroup[] }) {
    const s = page.scheme;
    const facts: Array<[string, ReactNode]> = [['Ministry', s.ministry], ['Category', s.category]];
    if (s.interestRate) facts.push(['Interest rate', s.interestRate]);
    if (s.benefitAmount) facts.push(['Benefit', s.benefitAmount]);
    if (s.tenure) facts.push(['Tenure', s.tenure]);
    if (s.minAmount) facts.push(['Minimum', s.minAmount]);
    if (s.maxAmount) facts.push(['Maximum', s.maxAmount]);
    if (s.taxBenefit) facts.push(['Tax benefit', s.taxBenefit]);
    facts.push(['How to apply', s.applicationType]);
    if (s.launchYear) facts.push(['Launched', String(s.launchYear)]);
    facts.push(['Last verified', page.verified ?? 'Not recorded']);
    // Verified content carries its own amounts table; the app's numeric facts were not re-verified, so
    // a verified page shows only the non-numeric ones.
    if (page.content) return <SchemeViewV2 page={page} facts={facts.filter(([k]) => ['Ministry', 'Category', 'How to apply', 'Launched', 'Last verified'].includes(k))} footer={footer} />;
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { href: '/schemes', label: 'Government schemes' }, { label: s.name }]}>
            <header className="page-head">
                <p className="eyebrow">{s.category} · Central government scheme</p>
                <h1 className="serif">{s.name}</h1>
                <GovtNoticeWeb label="Official portal" links={[{ name: s.name, url: s.officialWebsite }]} />
                <p className="lead">{s.description}</p>
            </header>
            <dl className="facts">
                {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <p className="official"><a className="text-link" href={s.officialWebsite} rel="noopener external" target="_blank">Official website <span aria-hidden="true">↗</span></a></p>
            <List title="Benefits" items={s.benefits} />
            <List title="Who can apply" items={s.eligibility} />
            <List title="Documents" items={s.documents} />
            <List title="How to apply" items={s.howToApply} />
            {s.notes && <section className="prose-sec"><h2 className="serif">Notes</h2><p>{s.notes}</p></section>}
            {page.guide && <p className="guide-link"><a className="text-link" href={page.guide}>Work out the returns with the calculator <span aria-hidden="true">→</span></a></p>}
            <p className="disc">Details as listed in the FinCalix app{page.verified ? `, last checked against the official source on ${page.verified}` : ''}. Rules and rates change: confirm on the official website before you apply. FinCalix is not affiliated with the Government of India.</p>
        </Page>
    );
}

/** Scheme page with verified website content (schemes/content/<id>.ts): answer first, then the details. */
function SchemeViewV2({ page, facts, footer }: { page: SchemePage; facts: Array<[string, ReactNode]>; footer: FooterGroup[] }) {
    const s = page.scheme;
    const c = page.content!;
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { href: '/schemes', label: 'Government schemes' }, { label: s.name }]}>
            <header className="page-head fhead">
                <p className="eyebrow">{s.category} · Central government scheme</p>
                <h1 className="serif">{c.h1}</h1>
                <GovtNoticeWeb label="Official portal" links={[{ name: c.portal.label, url: c.portal.url }]} />
                <div className="answer">{c.answer.map((p) => <p key={p}>{p}</p>)}</div>
                <p className="updated">
                    Last verified {page.verified} · Sources:{' '}
                    {c.sources.map((src, i) => <span key={src.url}>{i > 0 && ', '}<a href={src.url} target="_blank" rel="noopener external">{src.label}</a></span>)}
                </p>
            </header>
            <dl className="facts">
                {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            {c.table && <section className="fsec"><DataTable caption={c.table.caption} head={c.table.head} rows={c.table.rows} note={c.table.note} /></section>}
            <List title="Benefits" items={c.benefits ?? s.benefits} />
            <List title="Who can apply" items={c.eligibility ?? s.eligibility} />
            {c.notEligible && <List title="Who cannot apply" items={c.notEligible} />}
            <List title="Documents" items={c.documents ?? s.documents} />
            <section className="prose-sec">
                <h2 className="serif">How to apply</h2>
                <ol className="steps">{c.howToApply.map((x) => <li key={x}>{x}</li>)}</ol>
            </section>
            {c.statusSteps && (
                <section className="prose-sec">
                    <h2 className="serif">How to check your status</h2>
                    <ol className="steps">{c.statusSteps.map((x) => <li key={x}>{x}</li>)}</ol>
                    <p className="snote">FinCalix does not check status for you; the steps end on the official portal.</p>
                </section>
            )}
            <section className="prose-sec">
                <h2 className="serif">Official portal{c.helpline ? ' and helpline' : ''}</h2>
                <p><a className="text-link" href={c.portal.url} rel="noopener external" target="_blank">{c.portal.label} <span aria-hidden="true">↗</span></a></p>
                {c.helpline && <p>Helpline: {c.helpline}</p>}
            </section>
            <section className="faq fsec" aria-labelledby="faq-h">
                <h2 id="faq-h" className="serif">Questions people ask</h2>
                {c.faqs.map((q) => (<details key={q.q}><summary>{q.q}</summary><p>{q.a}</p></details>))}
            </section>
            <nav className="related fsec" aria-labelledby="rel-h">
                <h2 id="rel-h" className="serif">Related</h2>
                <ul className="list-reset">
                    {c.related.map((r) => <li key={r.href}><a href={r.href}>{r.label}</a><span>{r.note}</span></li>)}
                    {page.guide && <li><a href={page.guide}>Calculator for this scheme</a><span>Work out the returns</span></li>}
                    <li><a href="/schemes">All government schemes</a><span>Every central scheme in the app, explained</span></li>
                </ul>
            </nav>
            <p className="disc">Checked against the official sources above on {page.verified}. Rules, amounts and dates change: confirm on the official portal before you apply. FinCalix is not affiliated with the Government of India and does not process applications.</p>
        </Page>
    );
}

export const HOW_FAQS: ReadonlyArray<{ q: string; a: string }> = [
    { q: 'Are the figures on FinCalix the same as in the app?', a: 'Yes. The website calls the same calculation functions as the Android app, so an EMI, a tax figure or a maturity amount is identical in both for the same inputs.' },
    { q: 'Where do the tax slabs and rates come from?', a: 'From the official text: the Income-tax Act, 2025 and the Finance Act, 2026 for tax; RBI directions for loans and cards; the Government’s quarterly notification for small-savings rates. Each page links its sources and shows the date they were checked.' },
    { q: 'How often are rates and rules updated?', a: 'Small-savings rates are checked every quarter when the Government notifies them, tax rules after every Budget, and each scheme page shows the date it was last verified.' },
    { q: 'What happens when FinCalix finds a mistake?', a: `The shared calculation is corrected for both the app and the website, an independent check is added so it cannot come back, and the change is listed on the updates page. Report anything that looks wrong to ${SUPPORT_EMAIL}.` },
    { q: 'Is FinCalix financial advice?', a: 'No. FinCalix gives estimates from the inputs you enter and the published rules. Banks, the tax department and scheme offices compute the final figures; for decisions, speak to a qualified adviser.' },
    { q: 'Who makes FinCalix?', a: `FinCalix is built and published by ${PUBLISHER}, India. You can reach the team at ${SUPPORT_EMAIL}.` },
];

export function HowWeCalculateView({ footer }: { footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'How we calculate' }]}>
            <header className="page-head fhead">
                <p className="eyebrow">Method and sources</p>
                <h1 className="serif">How FinCalix calculates and checks its numbers</h1>
                <div className="answer">
                    <p>Every figure on fincalix.com is computed by the same code as the FinCalix Android app, from the rules in the official texts, and checked by independent re-calculations before the site is published.</p>
                    <p>{`FinCalix is built by ${PUBLISHER}, India (${SUPPORT_EMAIL}). It gives estimates, not advice.`}</p>
                </div>
            </header>
            <section className="prose-sec">
                <h2 className="serif">How a page is made</h2>
                <ol className="steps">{PROCESS.map((x) => <li key={x}>{x}</li>)}</ol>
            </section>
            <section className="fsec">
                <DataTable caption="Methods behind the main calculators" head={['What', 'How it is worked out', 'App function', 'Checked by']} rows={METHODS.map((m) => [m.area, m.how, m.fn, m.checked])} />
            </section>
            <section className="faq fsec" aria-labelledby="faq-h">
                <h2 id="faq-h" className="serif">Questions people ask</h2>
                {HOW_FAQS.map((q) => (<details key={q.q}><summary>{q.q}</summary><p>{q.a}</p></details>))}
            </section>
            <nav className="related fsec" aria-labelledby="rel-h">
                <h2 id="rel-h" className="serif">See it in use</h2>
                <ul className="list-reset">
                    <li><a href="/updates">Updates</a><span>Dated list of corrections and new pages</span></li>
                    <li><a href="/old-vs-new-tax-regime">Old vs new tax regime</a><span>Tax worked out slab by slab</span></li>
                    <li><a href="/home-loan-prepayment">Home loan prepayment</a><span>A month-by-month loan schedule</span></li>
                    <li><a href="/calculators">All calculators</a><span>Every tool, by category</span></li>
                </ul>
            </nav>
        </Page>
    );
}

export function UpdatesView({ footer }: { footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'Updates' }]}>
            <header className="page-head">
                <p className="eyebrow">Change log</p>
                <h1 className="serif">What changed on FinCalix</h1>
                <p className="lead">New pages, corrected calculations and rate checks, newest first. Corrections to a calculation apply to both the website and the Android app.</p>
            </header>
            {UPDATES.map((u) => (
                <section key={u.date + u.title} className="prose-sec">
                    <h2 className="serif"><time dateTime={u.date}>{longDate(u.date)}</time> — {u.title}</h2>
                    <ul>{u.items.map((x) => <li key={x}>{x}</li>)}</ul>
                </section>
            ))}
            <p className="guide-link"><a className="text-link" href="/how-we-calculate">How we calculate and check our numbers <span aria-hidden="true">→</span></a></p>
        </Page>
    );
}

/** JSON-LD for a scheme page with content: FAQPage + GovernmentService. */
export function schemeLd(page: SchemePage): object[] {
    const c = page.content;
    if (!c) return [];
    const url = `${ORIGIN}${page.path}`;
    return [
        { '@context': 'https://schema.org', '@type': 'FAQPage', url, mainEntity: c.faqs.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) },
        {
            '@context': 'https://schema.org', '@type': 'GovernmentService', name: page.scheme.name, description: c.description, url,
            serviceType: page.scheme.category, areaServed: { '@type': 'Country', name: 'India' },
            provider: { '@type': 'GovernmentOrganization', name: page.scheme.ministry },
            availableChannel: { '@type': 'ServiceChannel', serviceUrl: c.portal.url },
        },
    ];
}

export function InTheAppView({ footer }: { footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'In the app' }]}>
            <header className="page-head">
                <h1 className="serif">This part of FinCalix is in the Android app</h1>
                <p className="lead">Your profile, saved calculations, history, bookmarks, settings and notifications live in the FinCalix app on your phone. The app is free on Google Play, needs no login and keeps your data on your device.</p>
            </header>
            <ul className="next-links list-reset">
                <li><a className="text-link" href="/calculators">See every calculator <span aria-hidden="true">→</span></a></li>
                <li><a className="text-link" href="/schemes">Browse government schemes <span aria-hidden="true">→</span></a></li>
                <li><a className="text-link" href={EXPORT_PAGE}>Used FinCalix in this browser before? Export your data <span aria-hidden="true">→</span></a></li>
            </ul>
        </Page>
    );
}

export function NotFoundView({ footer }: { footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'Page not found' }]}>
            <header className="page-head">
                <p className="eyebrow">404</p>
                <h1 className="serif">We couldn’t find that page</h1>
                <p className="lead">The address may be mistyped, or the page may have moved. These are good places to start:</p>
            </header>
            <ul className="next-links list-reset">
                <li><a className="text-link" href="/">FinCalix home <span aria-hidden="true">→</span></a></li>
                <li><a className="text-link" href="/calculators">All calculators <span aria-hidden="true">→</span></a></li>
                <li><a className="text-link" href="/schemes">Government schemes <span aria-hidden="true">→</span></a></li>
                <li><a className="text-link" href="/income-tax">Income tax for FY 2026-27 <span aria-hidden="true">→</span></a></li>
            </ul>
        </Page>
    );
}

export function ExportView({ footer }: { footer: FooterGroup[] }) {
    return (
        <Page footer={footer} crumbs={[{ href: '/', label: 'Home' }, { label: 'Export my data' }]}>
            <header className="page-head">
                <p className="eyebrow">FinCalix now lives on Android</p>
                <h1 className="serif">Export your FinCalix data</h1>
                <p className="lead">If you used FinCalix in this web browser, your calculations, loans and expenses are saved here, in this browser only. Download them as a backup file and import it in the FinCalix Android app. The file is made on your device; nothing is uploaded.</p>
            </header>
            <section className="export-box" aria-live="polite" data-export-root>
                <p className="export-status" data-export-status>Checking this browser for FinCalix data…</p>
                <ul className="export-found" data-export-found hidden />
                <button type="button" className="btn btn-primary" data-export-button disabled>Download my data</button>
                <p className="export-done" data-export-done hidden />
                <noscript><p>Turn on JavaScript to read the data saved in this browser.</p></noscript>
            </section>
            <section className="prose-sec">
                <h2 className="serif">Then, on your Android phone</h2>
                <ol>{IMPORT_STEPS.map((x) => <li key={x}>{x}</li>)}</ol>
            </section>
            <p className="other-origin">
                <span data-origin="apex">Used FinCalix at <strong>www.fincalix.com</strong> before? That data is kept separately: <a href="https://www.fincalix.com/export-my-data">export it there</a>.</span>
                <span data-origin="www" hidden>Used FinCalix at <strong>fincalix.com</strong> too? <a href="https://fincalix.com/export-my-data">Export that data as well</a>.</span>
            </p>
        </Page>
    );
}
