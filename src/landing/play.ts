// Google Play links for the website (kept tiny: the browser bundle imports it).
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.fincalix.app';

/** Where a Google Play badge sits on the page (analytics "placement" and install referrer).
 *  'qr' is the desktop QR code: an install referrer only, never an analytics event. */
export type Placement = 'header' | 'hero' | 'mini_calc' | 'final_cta' | 'qr';

/** Play listing with an install referrer per placement, so installs can be attributed in Play Console. */
export function playUrl(placement: Placement): string {
    const referrer = `utm_source=fincalix.com&utm_medium=website&utm_campaign=landing&utm_content=${placement}`;
    return `${PLAY_URL}&referrer=${encodeURIComponent(referrer)}`;
}
