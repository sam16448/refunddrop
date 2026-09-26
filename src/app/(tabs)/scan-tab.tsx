import { Redirect } from 'expo-router';

/** Placeholder for the centre tab. Its button opens the scanner directly, so this screen is never shown. */
export default function ScanTab() {
  return <Redirect href="/scan" />;
}
