// The app's Data & Privacy screen: the website's text (src/pages/legal/DataPrivacy.tsx) in the app's frame.
import AppLegalScreen from './legal/AppLegalScreen';
import { DATA_PRIVACY } from './legal/DataPrivacy';

export default function DataPrivacy() {
    return <AppLegalScreen doc={DATA_PRIVACY} />;
}
