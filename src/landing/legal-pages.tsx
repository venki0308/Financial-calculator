/**
 * The legal pages, served as pre-rendered static HTML (dist/<name>/index.html) so they
 * work on fincalix.com without the app shell. The text has one source, shared with the app:
 *   - /privacy-policy, /data-privacy, /terms-of-service, /about → src/pages/legal/* (the app
 *     shows the same text in its own frame: src/pages/legal/AppLegalScreen.tsx)
 *   - /data-safety → src/pages/DataSafety (the app's own screen)
 * qa-landing 5c checks that [data-legal-content] reads the same in the app and on the website.
 */
import type { ComponentType } from 'react';
import PrivacyPolicy from '../pages/legal/PrivacyPolicy';
import DataPrivacy from '../pages/legal/DataPrivacy';
import TermsOfService from '../pages/legal/TermsOfService';
import About from '../pages/legal/About';

export const WEB_LEGAL_PAGES: Readonly<Record<string, ComponentType>> = {
    'privacy-policy': PrivacyPolicy,
    'data-privacy': DataPrivacy,
    'terms-of-service': TermsOfService,
    about: About,
};
