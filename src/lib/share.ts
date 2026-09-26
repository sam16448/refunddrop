import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Share } from 'react-native';
import type { Letter } from '@/claim/letters';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function letterHtml(letter: Letter): string {
  const paragraphs = letter.body
    .split('\n\n')
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.55; color: #111; margin: 48px; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 24px; }
  h1 { font-size: 13pt; margin: 0 0 18px; }
  p { margin: 0 0 12px; }
</style></head><body>
<div class="meta">To: ${escapeHtml(letter.to)}<br/>Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
<h1>${escapeHtml(letter.subject)}</h1>
${paragraphs}
</body></html>`;
}

export async function copyLetter(letter: Letter): Promise<void> {
  await Clipboard.setStringAsync(`${letter.subject}\n\n${letter.body}`);
  Alert.alert('Copied', 'Paste it into the airline’s claim form or an email.');
}

export async function shareLetter(letter: Letter): Promise<void> {
  await Share.share({ title: letter.subject, message: `${letter.subject}\n\n${letter.body}` });
}

export async function shareLetterPdf(letter: Letter): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html: letterHtml(letter) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: letter.subject, UTI: 'com.adobe.pdf' });
    } else {
      Alert.alert('PDF saved', uri);
    }
  } catch {
    Alert.alert('Could not create PDF', 'Try copying the letter instead.');
  }
}
