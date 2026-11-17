// The app's Privacy Policy screen: the website's text (src/pages/legal/PrivacyPolicy.tsx) in the app's frame.
import AppLegalScreen from './legal/AppLegalScreen';
import { PRIVACY_POLICY } from './legal/PrivacyPolicy';

export default function PrivacyPolicy() {
    return <AppLegalScreen doc={PRIVACY_POLICY} />;
}
