// The app's About screen: the website's text (src/pages/legal/About.tsx) in the app's frame.
import AppLegalScreen from './legal/AppLegalScreen';
import { ABOUT } from './legal/About';

export default function About() {
    return <AppLegalScreen doc={ABOUT} />;
}
