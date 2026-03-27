import LegalLayout, { Section, P, UL, Highlight } from './LegalLayout';

export default function DataPrivacy() {
    return (
        <LegalLayout title="Data & Privacy" updated="January 1, 2025">
            <Section title="Our Data Commitment">
                <Highlight>
                    FinCalix stores zero data on any server. Every byte of information you enter
                    stays on your device and is never transmitted anywhere.
                </Highlight>
            </Section>

            <Section title="What Data Does FinCalix Store?">
                <P>
                    The following data is stored <strong style={{ color: '#fff' }}>only locally on your device</strong>:
                </P>
                <UL items={[
                    'Expense entries — your daily and monthly expense records',
                    'Calculator history — recently used calculator inputs and results',
                    'Language preference — your selected app language',
                    'Theme settings — dark or light mode preference',
                    'Bookmarked schemes — government schemes you have saved',
                    'Goal planner data — your saved financial goals',
                ]} />
                <P>
                    None of this data is uploaded to or stored on any external server.
                </P>
            </Section>

            <Section title="How to Delete Your Data">
                <P>You can delete all locally stored data at any time:</P>
                <Highlight>
                    Open FinCalix → Settings → Clear Data → Confirm
                </Highlight>
                <P>
                    Alternatively, uninstalling the app from your device will permanently
                    remove all data associated with FinCalix.
                </P>
            </Section>

            <Section title="Data Export">
                <P>
                    You can export your expense data from the Expense Tracker module:
                </P>
                <UL items={[
                    'Export as PDF — formatted expense report',
                    'Export as Excel/CSV — raw data for spreadsheet use',
                    'Access via: Expense Tracker → Export → Choose Format',
                ]} />
            </Section>

            <Section title="GDPR & Data Compliance">
                <P>
                    FinCalix is fully compliant with GDPR and Indian data protection guidelines:
                </P>
                <UL items={[
                    'No personal data is collected or transmitted',
                    'No user profiling or behavioral tracking',
                    'No third-party data sharing (except optional AdMob for ads)',
                    'Right to erasure: delete app to remove all data instantly',
                    'No data retention — we hold nothing on our servers',
                ]} />
                <Highlight>
                    FinCalix does not process personal data within the meaning of GDPR.
                    No data controller or processor relationship exists with users.
                </Highlight>
            </Section>

            <Section title="Crash Reporting">
                <P>
                    FinCalix uses Firebase Crashlytics to collect anonymous, non-personal
                    crash reports. These reports help us fix bugs and improve stability.
                    Crash reports do not contain any user-entered data or personally
                    identifiable information.
                </P>
            </Section>

            <Section title="Questions?">
                <P>For any data-related questions or requests:</P>
                <Highlight>
                    📧 <strong>support@fincalix.com</strong>
                </Highlight>
            </Section>
        </LegalLayout>
    );
}
