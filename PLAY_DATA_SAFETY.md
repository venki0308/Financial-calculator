# Play Console Data safety answers

For FinCalix 1.3.0, build 22. Rewritten 18 November 2026 (no analytics switch in the app any more)
against Google's form definitions at <https://support.google.com/googleplay/android-developer/answer/10787469>.

## What build 22 actually does

- Usage analytics run for every user from app launch. There is no popup and no switch in the app (owner's decision, 18 Nov 2026), so users cannot opt out inside the app. `node scripts/qa-consent-network.mjs` checks this on fresh browser profiles.
- The app sends usage statistics to Google Analytics 4 through the Firebase JavaScript SDK inside the WebView:
  - Events: `page_view` (one per screen visit, with the screen name), `calculator_calculated` (once per completed calculation), `report_exported` (PDF, Excel or CSV), `scheme_viewed`, `language_changed`. Google Analytics adds first open, session start and engagement time on its own.
  - Website only (fincalix.com, not the Android app): `play_badge_click` when a visitor taps a Google Play badge, with `placement` (`header`, `hero`, `mini_calc` or `final_cta`). The privacy policy lists it.
  - Parameters, allow-listed per event: screen name and page address (record IDs replaced by ":id"), `calculator_id`, `export_format`, `language`, `scheme_type`. No amounts, inputs, results or typed text.
  - Identifiers and device data: a random Analytics client ID, a Firebase installation ID, screen resolution, language, OS and browser version. Google derives an approximate location from the IP address.
  - Events raised while offline are kept on the device (at most 200, none older than 7 days) and sent when the app is back online.
- Uninstalling the app or clearing its storage removes the client ID, the installation ID and any queued events from the device. Nothing in the app deletes them otherwise, and the app sends no deletion request to Google.
- No ads SDK, no account, no crash reporting (Crashlytics and Firebase Messaging were removed in build 22), no server of our own that receives user data.
- What users read: the disclaimer, privacy policy, Data & Privacy screen, website and store listing say "FinCalix collects anonymous usage statistics, such as which features are used most" and that financial amounts are never sent. At the owner's request (18 Nov 2026) they do not name the provider; the privacy policy says "an analytics service" processes the data on our behalf. The Data safety form asks for data types, not provider names.

## Step by step in Play Console

1. Play Console → FinCalix → **Policy and programs → App content → Data safety** → **Manage** (or **Start**).
2. **Overview**: read, then **Next**.
3. **Data collection and security**
   - Does your app collect or share any of the required user data types? → **Yes**
   - Is all of the user data collected by your app encrypted in transit? → **Yes** (HTTPS to Google)
   - Which of the following methods of account creation does your app support? → **My app does not allow users to create an account**
   - Do you provide a way for users to request that their data is deleted? → **No** (see "Answers I am unsure of", item 1)
   - Independent security review → leave unticked.
   - **Next**.
4. **Data types**: tick exactly these three, nothing else:
   - **Location → Approximate location**
   - **App activity → App interactions**
   - **Device or other IDs → Device or other IDs**
   - **Next**.
5. **Data usage and handling**: for each of the three types, click the arrow and answer the same way:
   - Is this data collected, shared, or both? → tick **Collected** only (not Shared).
   - Is this data processed ephemerally? → **No, this collected data is not processed ephemerally**
   - Is this data required for your app, or can users choose whether it's collected? → **Data collection is required (users can't turn off this data collection)**
   - Why is this user data collected? → **Analytics** only.
   - **Save**.
6. **Preview**: check that the store preview shows "Data collected: Location, App activity, Device or other IDs", "No data shared with third parties", "Data is encrypted in transit", and no deletion line → **Save**.
7. **Publishing overview** → **Send changes for review** (the Data safety change goes with the build 22 release or on its own).

### Summary table

| Data type (category) | Collected | Shared | Processed ephemerally | Required or optional | Purpose |
|---|---|---|---|---|---|
| App interactions (App activity) | Yes | No | No | **Required** (users can't turn off this data collection) | Analytics |
| Device or other IDs | Yes | No | No | **Required** | Analytics |
| Approximate location (Location) | Yes | No | No | **Required** | Analytics |

Everything else: **not collected**. In particular Crash logs, Diagnostics, Financial info, Personal info, Precise location, Files, Photos, Contacts and Messages. Unchanged from the 16 Nov answers except "Required" and the deletion question.

If the current declaration lists crash logs or diagnostics, remove them: builds from 1.2.2 onward could not send them, and build 22 no longer contains the SDK.

### Why "Shared: No"

Google's page says a transfer to a "service provider", defined as "an entity that processes user data on behalf of the developer and based on the developer's instructions", does not need to be disclosed as sharing. Google Analytics is used that way here.

## Answers I am unsure of

1. **Data deletion request.** There is no switch and no in-app deletion, events already stored in Google Analytics are not erased by uninstalling, and we cannot find one user's past events because the app never shows the user their ID. **"No"** is the answer I can stand behind. To answer "Yes" you would need a process (for example an email address plus a way to act on a client ID). Keeping the Analytics data retention at 2 months limits what is held.
2. **Approximate location.** Google's page says "Approximate location that is inferred, such as via IP address ... must be disclosed", and Analytics derives country, region and city by default, so I have listed it. If you turn off "granular location and device data" for all regions in Analytics Admin, only coarser location remains; I would still declare it.
3. **"Shared: No" depends on your Analytics settings.** If data sharing with other Google products, Google signals or ads links are enabled in the Analytics property, Google is no longer only a service provider and the answer becomes "Yes". The app switches Google signals and ad personalisation off in code, but the property settings are yours.
4. **IP addresses seen by fincalix.com and Google Fonts.** The app fetches `config.json` from fincalix.com and its font from Google Fonts. These are ordinary web requests that carry no user data; I have not listed them as collection. If your host keeps access logs you rely on, mention it in the privacy policy (the policy already does).
5. **"Anonymous".** The texts say "anonymous usage statistics" as you asked. Strictly, the data is pseudonymous (tied to a random ID, not to a name or contact details); the privacy policy and Data & Privacy screen say exactly that next to the word, so the claim stays accurate.

## Excluding test traffic from reports

Every automated check (`node scripts/qa-consent-network.mjs`, and any run with the device flag `fincalix_analytics_test_traffic` = `1`) sends its events with `debug_mode` and `traffic_type=internal`. Apply both filters once, in Google Analytics Admin:

1. Admin → Data collection and modification → Data filters → **Create filter** → **Developer traffic** → Operation: Exclude → Filter state: **Active** → Save. This drops events sent with `debug_mode` (they still appear in Admin → DebugView, which is useful for checking a release).
2. Admin → Data collection and modification → Data filters → open the **Internal Traffic** filter (create it if it is missing: type Internal traffic, parameter value `internal`) → Filter state: **Active** → Save. This drops events with `traffic_type=internal`.

Filters apply from the moment they are active; test events sent before that stay in the reports. A newly created filter can be left in "Testing" for a day first to see what it would remove (the "Test data filter name" dimension).

## Analytics property settings to match the policy

In Google Analytics Admin for this property:

- Google signals: off.
- Granular location and device data: off for all regions.
- Ads personalisation: off for all regions.
- Data sharing settings (Google products and services, benchmarking, technical support, account specialists): off.
- Data retention: 2 months.
- Enhanced measurement: leave only "Page views" on; set the other options (scrolls, outbound clicks, site search, form interactions, video and file downloads) to disabled so the event list in the policy stays exact.

## Where the same statements appear

- First-launch disclaimer (6 languages): `src/locales/*.json` → `disclaimer.dataPrivacyBody`.
- In-app Data & Privacy screen (6 languages): `src/locales/*.json` → `dataSafety.*` (also the website's /data-safety page).
- Privacy Policy and Data & Privacy, app and website from one source: `src/pages/legal/PrivacyPolicy.tsx`, `src/pages/legal/DataPrivacy.tsx`.
- Website: `src/landing/content.ts` (`ANALYTICS_LINE`, FAQ), `llms.txt` (generated by `scripts/landing/prerender.mjs`). Store listing draft: `PLAYSTORE_LISTING.md`.
