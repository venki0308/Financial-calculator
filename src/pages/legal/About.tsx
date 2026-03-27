import LegalLayout, { Section, P, UL, Highlight } from './LegalLayout';

export default function About() {
    return (
        <LegalLayout title="About FinCalix" updated="January 1, 2025">
            <Section title="Who We Are">
                <P>
                    <strong style={{ color: '#fff' }}>FinCalix</strong> is a free financial super calculator
                    platform built for India, by Indians. We are headquartered in Hyderabad, Telangana, India.
                </P>
                <Highlight>
                    Our mission: Make financial planning accessible to every Indian — completely free,
                    offline, and without requiring a login.
                </Highlight>
            </Section>

            <Section title="What We Build">
                <P>FinCalix brings together every financial calculator an Indian user needs in one app:</P>
                <UL items={[
                    '30+ financial calculators — SIP, EMI, FD, PPF, HRA, GST, Income Tax, and more',
                    '45+ government schemes — Central and state schemes with eligibility details',
                    'Expense Tracker — dashboard, budget planning, spending breakdown',
                    'Multilingual support — English, Hindi, Telugu, Tamil, Kannada',
                    'Budget 2026-27 updated — latest tax slabs, zero tax up to ₹12L (New Regime)',
                    '100% offline — no internet required for calculations',
                ]} />
            </Section>

            <Section title="Our Platform">
                <UL items={[
                    'Platform: Android (Google Play Store)',
                    'Version: 1.0.4',
                    'Languages: English, Hindi, Telugu, Tamil, Kannada',
                    'Target audience: Indian users of all income levels',
                    'Price: Free forever, no subscription, no paywall',
                ]} />
            </Section>

            <Section title="Our Values">
                <UL items={[
                    'Free forever — no hidden costs or premium tiers',
                    'Privacy first — no data collection, no login required',
                    'Offline first — works without internet connectivity',
                    'India first — designed specifically for Indian financial regulations and schemes',
                    'Accuracy — all calculators reflect current tax laws and scheme rates',
                ]} />
            </Section>

            <Section title="Contact Us">
                <P>Have questions, feedback, or want to report an issue?</P>
                <Highlight>
                    📧 <strong>support@fincalix.com</strong>
                    <br />
                    FinCalix Team, Hyderabad, Telangana, India
                </Highlight>
            </Section>

            <Section title="Download">
                <P>FinCalix is available free on Google Play Store:</P>
                <div style={{ marginTop: '16px' }}>
                    <a
                        href="https://play.google.com/store/apps/details?id=com.fincalix.app"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 24px',
                            borderRadius: '14px',
                            background: '#C9A84C',
                            color: '#0A1628',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '15px',
                        }}
                    >
                        ▶ Get it on Google Play
                    </a>
                </div>
            </Section>
        </LegalLayout>
    );
}
