/**
 * Schemes the app still lists as active but that have ended or merged, per the official source.
 * The website leaves them out of /schemes, the scheme counts and the scheme pages, and the old
 * address 308s to the successor (seoRoutes.MERGED_PAGES). The app's own record (src/data/schemes.ts)
 * still needs the same change in the next app release (APP_IDEAS.md).
 */
export const SCHEMES_ENDED: Readonly<Record<string, { reason: string; successor: string }>> = {
    'c-pmdaksh': { reason: 'Merged into PMKVY from 2024-25 (PIB, 22 Oct 2026)', successor: '/schemes/c-pmkvy' },
};

/** True for a central scheme the website still lists. */
export const listedOnWebsite = (s: { id: string; governmentLevel: string; isActive?: boolean }) =>
    s.governmentLevel === 'central' && s.isActive !== false && !SCHEMES_ENDED[s.id];
