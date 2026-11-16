# Play Console Data safety answers

For FinCalix 1.2.9, build 22 (branch `privacy/consent-1.2.9`). Written 16 November 2026 against Google's form definitions at
<https://support.google.com/googleplay/android-developer/answer/10787469>.

## What build 22 actually does

- Nothing is sent to Google unless the user turns on **Usage analytics** in Settings → Privacy. It is off by default and there is no popup. `node scripts/qa-consent-network.mjs` proves this on fresh browser profiles.
- If allowed, the app sends usage statistics to Google Analytics 4 through the Firebase JavaScript SDK inside the WebView:
  - Events: `page_view`, `screen_view` (including app open), `calculation_event`, `scheme_viewed`, `language_changed`, `export_event`. Google Analytics adds first open, session start and engagement time on its own.
  - Parameters: screen name, page path, calculator type, scheme type (central or state), language, export type, feature name, platform. No amounts and no typed text.
  - Identifiers and device data: a random Analytics client ID, a Firebase installation ID, screen resolution, language, OS and browser version. Google derives an approximate location from the IP address.
- Settings → Privacy → **Usage analytics** turns it off: collection stops, the Analytics cookies and Firebase IDs are deleted from the device, and Firebase is asked to delete the installation ID on its servers.
- No ads SDK, no account, no crash reporting (Crashlytics and Firebase Messaging were removed in build 22), no server of our own that receives user data.

Wording note: at the owner's request Settings, the disclaimer, the privacy policy and Data & Privacy screen say "an analytics service" and do not name the provider. The provider is still Google Analytics 4 (Firebase), which is what the answers below describe. The Data safety form asks for data types, not provider names.

## Answers to enter

### Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS to Google) |
| Do you provide a way for users to request that their data is deleted? | See "Unsure" item 1 |
| Account creation | The app has no accounts |

### Data types

Enter the same answers for each of the three types below.

| Data type (category) | Collected | Shared | Processed ephemerally | Required or optional | Purpose |
|---|---|---|---|---|---|
| App interactions (App activity) | Yes | No | No | Optional: users can choose whether this data is collected | Analytics |
| Device or other IDs | Yes | No | No | Optional | Analytics |
| Approximate location (Location) | Yes | No | No | Optional | Analytics |

Everything else: **not collected**. In particular Crash logs, Diagnostics, Financial info, Personal info, Precise location, Files, Photos, Contacts and Messages.

If the current declaration lists crash logs or diagnostics, remove them: builds from 1.2.2 onward could not send them, and build 22 no longer contains the SDK.

### Why "Shared: No"

Google's page says a transfer to a "service provider", defined as "an entity that processes user data on behalf of the developer and based on the developer's instructions", does not need to be disclosed as sharing. Google Analytics is used that way here.

## Answers I am unsure of

1. **Data deletion request.** The Settings toggle deletes the identifiers on the device and the Firebase installation ID, but it does not erase events already stored in Google Analytics, and we cannot find one user's past events once their ID is gone. If the form needs a yes/no, **"No"** is the answer I can stand behind today. To answer "Yes" you would need a process, for example an email address plus a way to act on a client ID. Lowering the Analytics data retention to 2 months reduces what is held.
2. **Approximate location.** Google's page says "Approximate location that is inferred, such as via IP address ... must be disclosed", and Analytics derives country, region and city by default, so I have listed it. If you turn off "granular location and device data" for all regions in Analytics Admin, only coarser location remains; I would still declare it.
3. **"Shared: No" depends on your Analytics settings.** If data sharing with other Google products, Google signals or ads links are enabled in the Analytics property, Google is no longer only a service provider and the answer becomes "Yes". The app switches Google signals and ad personalisation off in code, but the property settings are yours.
4. **IP addresses seen by fincalix.com and Google Fonts.** The app fetches `config.json` from fincalix.com and its font from Google Fonts. These are ordinary web requests that carry no user data; I have not listed them as collection. If your host keeps access logs you rely on, mention it in the privacy policy (the policy already does).

## Analytics property settings to match the policy

In Google Analytics Admin for this property:

- Google signals: off.
- Granular location and device data: off for all regions.
- Ads personalisation: off for all regions.
- Data sharing settings (Google products and services, benchmarking, technical support, account specialists): off.
- Data retention: 2 months.
- Enhanced measurement: leave only "Page views" on; turn off scrolls, outbound clicks, site search, form interactions, video and file downloads so the event list in the policy stays exact.

## Where the same statements appear

- First-launch disclaimer and the Settings switch (6 languages): `src/locales/*.json` → `disclaimer.dataPrivacyBody`, `settings.usageAnalytics*`.
- In-app privacy policy and Data & Privacy screen: `privacyPolicy.*`, `dataSafety.*`.
- Public pages: `src/pages/legal/PrivacyPolicy.tsx`, `src/pages/legal/DataPrivacy.tsx`.
