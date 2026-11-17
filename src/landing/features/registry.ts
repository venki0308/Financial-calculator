/**
 * Every feature page, in the order they are built. The build fails if this list and
 * seoRoutes.FEATURE_PAGES disagree, or if a page breaks the title/description limits.
 */
import { FEATURE_PAGES } from '../seoRoutes';
import type { FeatureDef } from './types';
import { creditCardInterest } from './pages/credit-card-interest';
import { goldLoanCalculator } from './pages/gold-loan-calculator';
import { homeLoanPrepayment } from './pages/home-loan-prepayment';
import { incomeTax } from './pages/income-tax';
import { incomeTaxDueDates } from './pages/income-tax-due-dates';
import { oldVsNewTaxRegime } from './pages/old-vs-new-tax-regime';
import { postOfficeTd } from './pages/post-office-td';
import { sipFor1Crore } from './pages/sip-for-1-crore';
import { stepUpSipPage } from './pages/step-up-sip';
import { sukanyaSamriddhi } from './pages/sukanya-samriddhi';

export const FEATURES: readonly FeatureDef[] = [
    oldVsNewTaxRegime,
    homeLoanPrepayment,
    sipFor1Crore,
    stepUpSipPage,
    sukanyaSamriddhi,
    incomeTax,
    creditCardInterest,
    goldLoanCalculator,
    postOfficeTd,
    incomeTaxDueDates,
];

const ANALYTICS_TITLE = /^[A-Za-z0-9 &()'./-]{1,60}$/;   // services/providers/types.ts page_title rule

/** Throws on any rule a feature page breaks (run by entry-server before rendering). */
export function checkFeatures(): void {
    const slugs = FEATURES.map((f) => f.slug);
    const problems: string[] = [];
    for (const f of FEATURES) {
        if (!FEATURE_PAGES.includes(f.slug)) problems.push(`${f.slug}: not in seoRoutes.FEATURE_PAGES`);
        if (f.title.length > 60) problems.push(`${f.slug}: title ${f.title.length} chars (max 60)`);
        if (f.description.length > 155) problems.push(`${f.slug}: description ${f.description.length} chars (max 155)`);
        if (!ANALYTICS_TITLE.test(f.analyticsTitle)) problems.push(`${f.slug}: analytics title "${f.analyticsTitle}" breaks the page_title rule`);
        if (f.faqs.length < 5 || f.faqs.length > 8) problems.push(`${f.slug}: ${f.faqs.length} FAQs (5–8)`);
        if (f.related.length < 3 || f.related.length > 6) problems.push(`${f.slug}: ${f.related.length} related links (3–6)`);
        if (!f.sources.length) problems.push(`${f.slug}: no official source`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f.updated)) problems.push(`${f.slug}: updated must be YYYY-MM-DD`);
    }
    for (const p of FEATURE_PAGES) if (!slugs.includes(p)) problems.push(`${p}: in FEATURE_PAGES but no page module`);
    if (new Set(slugs).size !== slugs.length) problems.push('duplicate slug');
    if (problems.length) throw new Error(`feature pages:\n  ${problems.join('\n  ')}`);
}
