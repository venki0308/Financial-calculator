/**
 * The fincalix.com home page, pre-rendered to static HTML at build time
 * (scripts/landing/prerender.mjs). Its only goal is Google Play installs:
 * the one call to action is the official Google Play badge, in four places
 * (header, hero, after the mini-calculator, final band). The web app is not
 * linked from here. Everything is plain HTML except the islands (theme switch,
 * hero figure, mini-calculator, tool grid).
 */
import type { ReactNode } from 'react';
import { Island } from './islands';
import type { IslandProps } from './islands';
import { Shot } from './Shot';
import type { LandingData } from './data';
import { ANALYTICS_LINE, FEATURES, LANGUAGES, PRIVACY_CLAIMS, SUPPORT_EMAIL } from './content';
import { playUrl } from './play';
import type { Placement } from './play';
import { formatINR } from '../utils/calculations';
import badgeUrl from './assets/google-play-badge-en.png';
import iconUrl from './assets/fincalix-icon-96.webp';

/** The official Google Play badge (unaltered artwork), with an install referrer per placement. */
function PlayBadge({ placement, small }: { placement: Placement; small?: boolean }) {
    return (
        <a className={`play${small ? ' play-sm' : ''}`} href={playUrl(placement)} data-play={placement} target="_blank" rel="noopener">
            <img src={badgeUrl} width={646} height={250} alt="Get it on Google Play" />
        </a>
    );
}

function Section({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) {
    return <section id={id} className={`sec ${className}`} aria-labelledby={`${id}-h`}>{children}</section>;
}

const Check = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** Promote the visible hero screenshots (current theme) to an eager, high-priority load. */
const HERO_IMG_SCRIPT = `(function(){var t=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';document.querySelectorAll('img[data-hero].only-'+t).forEach(function(i){i.loading='eager';i.fetchPriority='high';});})();`;

export function Landing({ data }: { data: LandingData }) {
    const islandProps: IslandProps = { tools: data.tools };
    const { tax } = data;
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
                        <a href="#tools">Calculators</a>
                        <a href="#tax">Tax 2026-27</a>
                        <a href="#schemes">Schemes</a>
                        <a href="#privacy">Privacy</a>
                    </nav>
                    <div className="nav-right">
                        <Island name="header" props={islandProps} />
                        <PlayBadge placement="header" small />
                    </div>
                </div>
            </header>

            <main id="main">
                <div className="wrap hero">
                    <div className="hero-copy">
                        <p className="eyebrow">Free · No login · 6 Indian languages</p>
                        <h1 className="serif">Every money decision, <em>worked out</em> in seconds.</h1>
                        <p className="sub">EMI, SIP, income tax, government schemes and your monthly spending, in one Android app made for India. Your financial data stays on your device.</p>
                        <div className="ctas">
                            <PlayBadge placement="hero" />
                            <span className="cta-note">Free on Google Play for Android</span>
                        </div>
                        <ul className="trust-line">
                            <li><Check />No ads</li>
                            <li><Check />Works offline</li>
                            <li><Check />Tax rules for FY 2026-27</li>
                        </ul>
                    </div>
                    <div className="stage">
                        <Shot id="en-tax" hero className="p2" sizes="(max-width: 760px) 40vw, 222px" alt="FinCalix income tax screen comparing the New and Old Regime" />
                        <Shot id="en-home" hero className="p1" sizes="(max-width: 760px) 46vw, 252px" alt="FinCalix home screen with budget, daily quote and government schemes" />
                        <Island name="hero" props={islandProps} className="hero-card-slot" />
                    </div>
                    <script dangerouslySetInnerHTML={{ __html: HERO_IMG_SCRIPT }} />
                </div>

                <Section id="try" className="sec-try">
                    <div className="wrap">
                        <div className="sec-head">
                            <div>
                                <p className="eyebrow">Try it here</p>
                                <h2 id="try-h" className="serif">Real numbers, right now.</h2>
                            </div>
                            <p className="sec-lead">The same maths the app uses. Change any value and the result updates at once.</p>
                        </div>
                        <Island name="calc" props={islandProps} />
                        <div className="after-calc">
                            <p>Every calculator, the full schedule and PDF or Excel reports are in the app, and work offline.</p>
                            <PlayBadge placement="mini_calc" />
                        </div>
                    </div>
                </Section>

                <Section id="tax" className="sec-tax">
                    <div className="wrap">
                        <div className="tax">
                            <div>
                                <p className="eyebrow">Income tax · FY 2026-27 · New Regime</p>
                                <h2 id="tax-h" className="serif">No tax up to <span className="hl">₹12 lakh</span> of taxable income.</h2>
                                <p className="tax-lead">With the {formatINR(tax.stdDeduction)} standard deduction, a salary of up to {formatINR(tax.zeroTaxSalary)} pays no income tax under the New Regime. FinCalix compares it with the Old Regime for your own deductions.</p>
                                <a className="btn btn-on-dark" href="/income-tax">Read the income tax guide <span aria-hidden="true">→</span></a>
                            </div>
                            <dl className="tax-list">
                                <div><dt>Rebate limit, taxable income</dt><dd className="serif num">{formatINR(tax.rebateLimit)}</dd></div>
                                <div><dt>Standard deduction, salaried</dt><dd className="serif num">{formatINR(tax.stdDeduction)}</dd></div>
                                <div><dt>Tax on a {formatINR(tax.zeroTaxSalary)} salary, New Regime</dt><dd className="serif num">{formatINR(tax.newTaxAtZeroTaxSalary)}</dd></div>
                                <div><dt>Same salary, Old Regime, no deductions</dt><dd className="serif num">{formatINR(tax.oldTaxAtZeroTaxSalary)}</dd></div>
                            </dl>
                        </div>
                        <p className="disc">Worked out by the FinCalix tax engine for a resident salaried individual below 60, including 4% cess. Not tax advice; check your own case with a tax professional.</p>
                    </div>
                </Section>

                <Section id="tools" className="sec-tools">
                    <div className="wrap">
                        <div className="sec-head">
                            <div>
                                <p className="eyebrow">{data.calculatorCount} calculators · {data.toolCount - data.calculatorCount} trackers and planners</p>
                                <h2 id="tools-h" className="serif">Every tool, one search away.</h2>
                            </div>
                            <p className="sec-lead">All of these are in the free Android app. Tools marked “Guide” also have a page on this site.</p>
                        </div>
                        <Island name="tools" props={islandProps} />
                    </div>
                </Section>

                <Section id="features" className="sec-features">
                    <div className="wrap">
                        <div className="sec-head">
                            <div>
                                <p className="eyebrow">Beyond calculators</p>
                                <h2 id="features-h" className="serif">Your money, organised.</h2>
                            </div>
                        </div>
                        {FEATURES.map((f, i) => (
                            <article key={f.id} className={`feat${i % 2 ? ' rev' : ''}`} aria-labelledby={`feat-${f.id}`}>
                                <div className="feat-img"><Shot id={f.shot} alt={f.alt} sizes="(max-width: 760px) 220px, 250px" /></div>
                                <div className="feat-copy">
                                    <p className="eyebrow">{f.eyebrow}</p>
                                    <h3 id={`feat-${f.id}`} className="serif">{f.title}</h3>
                                    <ul>{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
                                </div>
                            </article>
                        ))}
                    </div>
                </Section>

                <Section id="languages" className="sec-langs">
                    <div className="wrap">
                        <div className="sec-head">
                            <div>
                                <p className="eyebrow">6 languages</p>
                                <h2 id="languages-h" className="serif">Speaks your language.</h2>
                            </div>
                            <p className="sec-lead">Switch the whole app between {LANGUAGES.map((l) => l.native).join(', ').replace(/, ([^,]*)$/, ' and $1')}.</p>
                        </div>
                        <div className="langs">
                            {LANGUAGES.map((l) => (
                                <figure key={l.code}>
                                    <Shot id={`${l.code}-home-mini`} className="mini" sizes="(max-width: 760px) 30vw, 170px" alt={`FinCalix home screen in ${l.label}`} />
                                    <figcaption lang={l.code}>{l.native}</figcaption>
                                </figure>
                            ))}
                        </div>
                    </div>
                </Section>

                <Section id="schemes" className="sec-schemes">
                    <div className="wrap">
                        <div className="sec-head">
                            <div>
                                <p className="eyebrow">Government schemes</p>
                                <h2 id="schemes-h" className="serif"><span className="num">{data.schemeCount}</span> central schemes, explained simply.</h2>
                            </div>
                        </div>
                        <p className="sec-lead">All {data.schemeCount} are in the app, with eligibility, benefits, documents and how to apply. A few popular ones:</p>
                        <ul className="schemes">
                            {data.schemeCards.map((s) => {
                                const inner = (
                                    <>
                                        <span className="scheme-cat">{s.category}</span>
                                        <span className="scheme-name serif">{s.name}</span>
                                        <span className="scheme-fig num">{s.figure}</span>
                                        {s.verified && <span className="scheme-ver">Checked {s.verified}</span>}
                                        {s.href && <span className="tool-guide" aria-hidden="true">Guide →</span>}
                                    </>
                                );
                                return <li key={s.id}>{s.href ? <a className="scheme scheme-link" href={s.href}>{inner}</a> : <div className="scheme">{inner}</div>}</li>;
                            })}
                        </ul>
                        <p className="disc">Rates and benefits as listed in the app, with the month they were last checked against official sources.</p>
                    </div>
                </Section>

                <Section id="privacy" className="sec-privacy">
                    <div className="wrap">
                        <h2 id="privacy-h" className="serif">Built to be trusted.</h2>
                        <ul className="trust">
                            {PRIVACY_CLAIMS.map((c) => (
                                <li key={c.title}><span className="trust-t serif">{c.title}</span><span className="trust-b">{c.body}</span></li>
                            ))}
                        </ul>
                        <p className="note">{ANALYTICS_LINE} <a href="/privacy-policy">Read the privacy policy</a></p>
                    </div>
                </Section>

                <Section id="faq" className="sec-faq">
                    <div className="wrap faq">
                        <h2 id="faq-h" className="serif">Questions, answered.</h2>
                        {data.faq.map((f, i) => (
                            <details key={f.q} open={i === 0}>
                                <summary><span>{f.q}</span></summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </Section>

                <section className="band" aria-labelledby="band-h">
                    <div className="wrap">
                        <h2 id="band-h" className="serif">Your next money decision,<br />sorted in seconds.</h2>
                        <p className="band-sub">Free on Google Play. No login, no ads.</p>
                        <div className="ctas"><PlayBadge placement="final_cta" /></div>
                    </div>
                </section>
            </main>

            <footer className="ftr">
                <div className="wrap">
                    <div className="fgrid">
                        <div className="fbrand">
                            <a className="logo" href="/" aria-label="FinCalix home"><img src={iconUrl} width={34} height={34} alt="" /><span>FinCalix</span></a>
                            <p>Free money calculators for India.</p>
                            <p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
                        </div>
                        {data.footer.map((c) => (
                            <nav key={c.id} aria-labelledby={`f-${c.id}`}>
                                <h3 id={`f-${c.id}`}>{c.label}</h3>
                                <ul>{c.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
                            </nav>
                        ))}
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
        </>
    );
}
