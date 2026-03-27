import LegalLayout, { Section, P, UL, Highlight } from './LegalLayout';

export default function PrivacyPolicy() {
    return (
        <LegalLayout title="Privacy Policy" updated="January 1, 2025">
            <Section title="Overview">
                <P>
                    FinCalix ("we", "our", "the app") is developed by the FinCalix Team, Hyderabad, India.
                    This Privacy Policy explains how we handle your information when you use our app.
                </P>
                <Highlight>
                    FinCalix does not collect, store, or transmit any personal information to external servers.
                    All data stays on your device, always.
                </Highlight>
            </Section>

            <Section title="Information We Collect">
                <P>
                    FinCalix does not collect any personal information. All calculations are performed
                    locally on your device. We do not require login or account creation.
                </P>
                <P>We do not collect:</P>
                <UL items={[
                    'Name, email address, or phone number',
                    'Device identifiers or advertising IDs',
                    'Location data',
                    'Financial data entered into calculators',
                    'Usage analytics or crash reports (beyond optional Firebase Crashlytics)',
                ]} />
            </Section>

            <Section title="Data Storage">
                <P>
                    All user data — including expense entries, calculator preferences, and settings —
                    is stored locally on your device only. We do not transmit any data to external servers.
                </P>
                <UL items={[
                    'Expense entries: stored on-device using local storage',
                    'Calculator history: stored on-device only',
                    'Language and theme preferences: stored on-device only',
                    'No cloud sync, no server uploads',
                ]} />
            </Section>

            <Section title="Permissions Used">
                <P>
                    FinCalix does not request any sensitive permissions. No camera, microphone,
                    contacts, or location access is required or requested.
                </P>
                <UL items={[
                    'Internet: required only for loading app updates and Google Fonts',
                    'No location permission',
                    'No camera or microphone permission',
                    'No contacts or storage permission',
                ]} />
            </Section>

            <Section title="Third Party Services">
                <P>
                    We may use Google AdMob for advertisements in future versions of the app.
                    When enabled, AdMob's privacy policy applies to ad serving and may collect
                    advertising identifiers.
                </P>
                <P>
                    We use Firebase Crashlytics to collect anonymous crash reports to improve
                    app stability. No personally identifiable information is included in these reports.
                </P>
            </Section>

            <Section title="Children's Privacy">
                <P>
                    FinCalix does not knowingly collect data from children under the age of 13.
                    The app does not require registration and does not collect personal information
                    from any user, regardless of age.
                </P>
            </Section>

            <Section title="Changes to This Policy">
                <P>
                    We may update this Privacy Policy from time to time. Any changes will be
                    reflected on this page with an updated effective date. Continued use of the app
                    after changes constitutes your acceptance of the updated policy.
                </P>
            </Section>

            <Section title="Contact Us">
                <P>For privacy concerns, questions, or requests, please contact us at:</P>
                <Highlight>
                    📧 <strong>support@fincalix.com</strong>
                    <br />
                    FinCalix Team, Hyderabad, Telangana, India
                </Highlight>
            </Section>
        </LegalLayout>
    );
}
