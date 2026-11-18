import type { Lang } from '../LegalLayout';
import { en, type LegalStrings } from './en';
import { text as hi } from './hi';
import { text as te } from './te';
import { text as ta } from './ta';
import { text as kn } from './kn';
import { text as ml } from './ml';

export type { LegalStrings, Emph, Resource } from './en';

const TEXT: Readonly<Record<Lang, LegalStrings>> = { en, hi, te, ta, kn, ml };

/** The legal pages' body text in `lang` (headings and dates are each page's `meta`). */
export function legalText(lang: Lang): LegalStrings {
    return TEXT[lang] ?? en;
}
