/**
 * Everything on the website that is a count, a name or a figure, built at
 * pre-render time from the app's own sources:
 *   - tools:   src/data/calculatorList.ts (allCalcs + appTools), names from en.json
 *   - schemes: src/data/schemes.ts
 *   - tax:     src/utils/incomeTax.ts (the app's tax engine)
 * Only the pre-renderer imports this file; the browser receives the few values
 * the interactive parts need as JSON, never en.json itself.
 */
import en from '../locales/en.json';
import { allCalcs, appTools, CalcItem } from '../data/calculatorList';
import { schemes } from '../data/schemes';
import { compareSalaryTax, NEW_REGIME_REBATE_LIMIT, NEW_REGIME_STANDARD_DEDUCTION } from '../utils/incomeTax';
import { formatINR } from '../utils/calculations';
import { APP_ALIASES, APP_CANONICAL } from './seoRoutes';
import { SITE_CATEGORIES, siteCategory, SiteCategory } from './categories';
import { FAQ_TEMPLATES, Faq, SCHEME_CARD_IDS } from './content';

export interface ToolCard {
    name: string;
    desc: string;
    path: string;
    cat: SiteCategory;
    color: string;
    keywords: string;
    /** Static guide page for this tool on fincalix.com, if there is one. */
    href: string | null;
}

export interface SchemeCard {
    id: string;
    name: string;
    category: string;
    figure: string;
    verified: string | null;
    /** Static guide page for this scheme, if there is one. */
    href: string | null;
}

export interface LandingData {
    tools: ToolCard[];
    calculatorCount: number;
    toolCount: number;
    schemeCount: number;
    schemeCards: SchemeCard[];
    tax: {
        rebateLimit: number;
        stdDeduction: number;
        zeroTaxSalary: number;
        newTaxAtZeroTaxSalary: number;
        oldTaxAtZeroTaxSalary: number;
        newTaxJustAbove: number;
    };
    faq: Faq[];
    footer: Array<{ id: SiteCategory; label: string; links: Array<{ href: string; label: string }> }>;
}

function tr(key: string): string {
    const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en);
    if (typeof v !== 'string') throw new Error(`landing: missing English text for ${key}`);
    return v;
}

const toolCard = (c: CalcItem): ToolCard => ({
    name: tr(c.nameKey),
    desc: tr(c.descKey),
    path: c.path,
    cat: siteCategory(c),
    color: c.color,
    keywords: (c.keywords || []).join(' '),
    href: APP_CANONICAL[c.path] ?? null,
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = (iso?: string) => {
    const m = iso && iso.match(/^(\d{4})-(\d{2})/);
    return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
};

export function buildData(): LandingData {
    const tools = [...allCalcs, ...appTools].map(toolCard);
    if (new Set(tools.map((t) => t.path)).size !== tools.length) throw new Error('landing: duplicate tool path in the registry');

    const central = schemes.filter((s) => s.governmentLevel === 'central' && s.isActive !== false);
    const schemeCards = SCHEME_CARD_IDS.map((id) => {
        const s = schemes.find((x) => x.id === id);
        if (!s) throw new Error(`landing: scheme ${id} not in schemes.ts`);
        const figure = s.interestRate || s.benefitAmount;
        if (!figure) throw new Error(`landing: scheme ${id} has no rate or benefit amount`);
        return { id: s.id, name: s.name, category: s.category, figure, verified: monthYear(s.lastVerified), href: APP_CANONICAL['/scheme/' + s.id] ?? null };
    });

    const rebateLimit = NEW_REGIME_REBATE_LIMIT;
    const stdDeduction = NEW_REGIME_STANDARD_DEDUCTION;
    const zeroTaxSalary = rebateLimit + stdDeduction;
    const atZero = compareSalaryTax(zeroTaxSalary, 0);
    const justAbove = compareSalaryTax(zeroTaxSalary + 10, 0);
    if (atZero.newTax.totalTax !== 0 || justAbove.newTax.totalTax <= 0) throw new Error('landing: tax engine does not confirm the zero-tax limit');
    const tax = {
        rebateLimit, stdDeduction, zeroTaxSalary,
        newTaxAtZeroTaxSalary: atZero.newTax.totalTax,
        oldTaxAtZeroTaxSalary: Math.round(atZero.oldTax.totalTax),
        newTaxJustAbove: justAbove.newTax.totalTax,
    };

    const fill = (s: string) => s
        .replace('{rebateLimit}', formatINR(rebateLimit))
        .replace('{stdDeduction}', formatINR(stdDeduction))
        .replace('{zeroTaxSalary}', formatINR(zeroTaxSalary));
    const faq = FAQ_TEMPLATES.map((f) => ({ q: fill(f.q), a: fill(f.a) }));
    if (faq.some((f) => /\{\w+\}/.test(f.q + f.a))) throw new Error('landing: unfilled FAQ placeholder');

    // Footer: the static calculator pages, grouped like the tool grid, named after the app's own tool.
    const byPath = new Map(tools.map((t) => [t.path, t]));
    const seen = new Set<string>();
    const staticLinks = Object.entries(APP_CANONICAL).flatMap(([appPath, staticPath]) => {
        // One link per page (a merged scheme and its calculator share a page).
        if (seen.has(staticPath)) return [];
        if (appPath.startsWith('/scheme/')) {
            const s = schemes.find((x) => x.id === appPath.slice('/scheme/'.length));
            if (!s) throw new Error(`landing: ${appPath} not in schemes.ts`);
            seen.add(staticPath);
            return [{ cat: 'retire' as SiteCategory, href: staticPath, label: s.name }];
        }
        // App aliases with their own page (e.g. /calculator/step-up-sip) and app screens such as
        // /notifications are not registry tools; their pages are linked from the feature pages.
        if (APP_ALIASES[appPath] || (!byPath.has(appPath) && !appPath.startsWith('/calculator/'))) return [];
        const t = byPath.get(appPath);
        if (!t) throw new Error(`landing: ${appPath} is not in the calculator registry`);
        seen.add(staticPath);
        return [{ cat: t.cat, href: staticPath, label: t.name }];
    });
    const footer = SITE_CATEGORIES
        .map((c) => ({ id: c.id, label: c.label, links: staticLinks.filter((l) => l.cat === c.id).map(({ href, label }) => ({ href, label })) }))
        .filter((c) => c.links.length);

    return {
        tools,
        calculatorCount: allCalcs.length,
        toolCount: tools.length,
        schemeCount: central.length,
        schemeCards,
        tax,
        faq,
        footer,
    };
}
