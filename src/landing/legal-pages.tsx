/**
 * The legal pages, served as pre-rendered static HTML (dist/<name>/index.html) so they
 * work on fincalix.com without the app shell. They render the very same components the
 * app used for these URLs, so the wording is identical:
 *   - /privacy-policy, /data-privacy, /terms-of-service, /about → src/pages/legal/*
 *   - /data-safety → src/pages/DataSafety (the in-app screen that URL showed)
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
