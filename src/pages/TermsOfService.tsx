// The app's Terms of Service screen: the website's text (src/pages/legal/TermsOfService.tsx) in the app's frame.
import AppLegalScreen from './legal/AppLegalScreen';
import { TERMS_OF_SERVICE } from './legal/TermsOfService';

export default function TermsOfService() {
    return <AppLegalScreen doc={TERMS_OF_SERVICE} />;
}
