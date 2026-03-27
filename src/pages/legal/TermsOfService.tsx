import LegalLayout, { Section, P, UL, Highlight } from './LegalLayout';

export default function TermsOfService() {
    return (
        <LegalLayout title="Terms of Service" updated="January 1, 2025">
            <Section title="Agreement to Terms">
                <P>
                    By downloading, installing, or using FinCalix ("the App"), you agree to be bound
                    by these Terms of Service. If you do not agree to these terms, do not use the App.
                </P>
            </Section>

            <Section title="Use of the App">
                <P>
                    FinCalix is a free financial calculator application provided for personal,
                    non-commercial use. The App is provided "as is" without any warranty of any kind.
                </P>
                <UL items={[
                    'The App is free to use with no subscription or account required',
                    'You may not reverse-engineer, modify, or redistribute the App',
                    'You may not use the App for any unlawful purpose',
                    'We reserve the right to update or discontinue the App at any time',
                ]} />
            </Section>

            <Section title="Disclaimer of Financial Advice">
                <Highlight>
                    FinCalix calculations are for informational and educational purposes only.
                    They are NOT a substitute for professional financial, tax, or investment advice.
                </Highlight>
                <P>
                    All calculators — including SIP, EMI, tax, PPF, and others — provide estimates
                    based on the inputs you provide and standard financial formulas. Actual results
                    may differ due to market conditions, regulatory changes, or individual circumstances.
                </P>
                <P>
                    Always consult a qualified financial advisor, chartered accountant, or tax
                    professional before making financial decisions.
                </P>
            </Section>

            <Section title="User Responsibility">
                <UL items={[
                    'You are responsible for verifying the accuracy of all calculations',
                    'You are responsible for any financial decisions made based on App results',
                    'You are responsible for keeping your device and data secure',
                    'Input values and calculation results are stored locally; you own your data',
                ]} />
            </Section>

            <Section title="Limitation of Liability">
                <P>
                    To the maximum extent permitted by applicable law, FinCalix and its developers
                    shall not be liable for any direct, indirect, incidental, special, or consequential
                    damages arising from:
                </P>
                <UL items={[
                    'Use or inability to use the App',
                    'Financial decisions made based on App calculations',
                    'Inaccuracies in calculation results',
                    'Loss of data stored in the App',
                ]} />
            </Section>

            <Section title="Intellectual Property">
                <P>
                    All content, design, and code within FinCalix is the intellectual property of
                    the FinCalix Team. You may not copy, reproduce, or distribute any part of the
                    App without prior written permission.
                </P>
            </Section>

            <Section title="Changes to Terms">
                <P>
                    We reserve the right to update these Terms of Service at any time. Changes will
                    be posted on this page. Continued use of the App after changes constitutes
                    acceptance of the updated terms.
                </P>
            </Section>

            <Section title="Governing Law">
                <P>
                    These Terms of Service are governed by the laws of India. Any disputes arising
                    from use of the App shall be subject to the exclusive jurisdiction of the courts
                    in Hyderabad, Telangana, India.
                </P>
            </Section>

            <Section title="Contact">
                <P>For questions about these Terms:</P>
                <Highlight>
                    📧 <strong>support@fincalix.com</strong>
                    <br />
                    FinCalix Team, Hyderabad, Telangana, India
                </Highlight>
            </Section>
        </LegalLayout>
    );
}
