import { useTranslation } from 'react-i18next';
import type { Scheme } from '../data/schemes';

/**
 * Translates scheme content using i18n keys with fallback to original English.
 * Keys follow pattern: sd.<schemeId>.<field>
 */
export function useTranslatedScheme(scheme: Scheme): Scheme {
    const { t, i18n } = useTranslation();
    if (i18n.language === 'en') return scheme;

    const id = scheme.id;
    return {
        ...scheme,
        name: t(`sd.${id}.n`, { defaultValue: scheme.name }),
        description: t(`sd.${id}.d`, { defaultValue: scheme.description }),
        ministry: t(`sd.${id}.m`, { defaultValue: scheme.ministry }),
        schemeCategory: t(`sd.${id}.sc`, { defaultValue: scheme.schemeCategory }),
        benefitAmount: scheme.benefitAmount ? t(`sd.${id}.ba`, { defaultValue: scheme.benefitAmount }) : undefined,
        notes: scheme.notes ? t(`sd.${id}.nt`, { defaultValue: scheme.notes }) : undefined,
        eligibility: scheme.eligibility.map((e, i) => t(`sd.${id}.e.${i}`, { defaultValue: e })),
        benefits: scheme.benefits.map((b, i) => t(`sd.${id}.b.${i}`, { defaultValue: b })),
        documents: scheme.documents.map((d, i) => t(`sd.${id}.dc.${i}`, { defaultValue: d })),
        howToApply: scheme.howToApply.map((h, i) => t(`sd.${id}.h.${i}`, { defaultValue: h })),
    };
}

/**
 * Translate scheme for list view (only name + description for performance)
 */
export function useTranslatedSchemeList(schemeList: Scheme[]): Scheme[] {
    const { t, i18n } = useTranslation();
    if (i18n.language === 'en') return schemeList;

    return schemeList.map(scheme => ({
        ...scheme,
        name: t(`sd.${scheme.id}.n`, { defaultValue: scheme.name }),
        description: t(`sd.${scheme.id}.d`, { defaultValue: scheme.description }),
        benefitAmount: scheme.benefitAmount ? t(`sd.${scheme.id}.ba`, { defaultValue: scheme.benefitAmount }) : undefined,
    }));
}
