import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { endpoints } from '@/services/api/endpoints';

/** A4 portrait in points, which is also the size of the server's page in CSS pixels. */
export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;
/** Android sizes the sheet in points (1/72 in) but lays HTML out in CSS pixels (1/96 in), so the page has to grow to fill it. */
const ANDROID_PAGE_ZOOM = '<style>html{zoom:1.3333}</style>';

/** Documents already fetched this session: viewing, then saving or sharing, downloads the page once. */
const documents = new Map<string, Promise<string>>();

/** The certificate page as the server draws it, the same HTML that is shown and printed. */
export function certificateHtml(serial: string): Promise<string> {
  let html = documents.get(serial);
  if (!html) {
    html = endpoints.certificateDocument(serial).then((document) => document.html);
    // A failed fetch must not stick: the next attempt asks again.
    html.catch(() => documents.delete(serial));
    documents.set(serial, html);
  }
  return html;
}

async function renderPdf(serial: string): Promise<File> {
  const html = await certificateHtml(serial);
  const page = Platform.OS === 'android' ? html.replace('</head>', `${ANDROID_PAGE_ZOOM}</head>`) : html;
  const { uri } = await Print.printToFileAsync({ html: page, width: PAGE_WIDTH, height: PAGE_HEIGHT });

  // Printing names the file at random; this is the name the learner sees and sends on.
  const named = new File(Paths.cache, `MenTalk-Certificate-${serial}.pdf`);
  if (named.exists) named.delete();
  new File(uri).move(named);
  return named;
}

export async function shareCertificate(serial: string): Promise<void> {
  const pdf = await renderPdf(serial);
  await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: pdf.name });
}

/**
 * Android saves into a folder the learner picks. iOS has no such picker: its share sheet offers
 * "Save to Files" instead. Returns whether the file was saved here, so the screen can say so.
 */
export async function saveCertificate(serial: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await shareCertificate(serial);
    return false;
  }

  const folder = await Directory.pickDirectoryAsync().catch(() => null);
  if (!folder) return false;

  const pdf = await renderPdf(serial);
  folder.createFile(pdf.name, 'application/pdf').write(await pdf.bytes());
  return true;
}
