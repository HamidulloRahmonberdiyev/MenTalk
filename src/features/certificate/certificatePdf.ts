import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { endpoints, type ApiCertificate } from '@/services/api/endpoints';

/** A4 landscape in points, which is also the size of the server's page in CSS pixels. */
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
/** Android sizes the sheet in points (1/72 in) but lays HTML out in CSS pixels (1/96 in), so the page has to grow to fill it. */
const ANDROID_PAGE_ZOOM = '<style>html{zoom:1.3333}</style>';

async function renderPdf({ serial }: ApiCertificate): Promise<File> {
  const { html } = await endpoints.certificateDocument(serial);
  const page = Platform.OS === 'android' ? html.replace('</head>', `${ANDROID_PAGE_ZOOM}</head>`) : html;
  const { uri } = await Print.printToFileAsync({ html: page, width: PAGE_WIDTH, height: PAGE_HEIGHT });

  // Printing names the file at random; this is the name the learner sees and sends on.
  const named = new File(Paths.cache, `MenTalk-Certificate-${serial}.pdf`);
  if (named.exists) named.delete();
  new File(uri).move(named);
  return named;
}

export async function shareCertificate(certificate: ApiCertificate): Promise<void> {
  const pdf = await renderPdf(certificate);
  await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: pdf.name });
}

/**
 * Android saves into a folder the learner picks. iOS has no such picker: its share sheet offers
 * "Save to Files" instead. Returns whether the file was saved here, so the screen can say so.
 */
export async function saveCertificate(certificate: ApiCertificate): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await shareCertificate(certificate);
    return false;
  }

  const folder = await Directory.pickDirectoryAsync().catch(() => null);
  if (!folder) return false;

  const pdf = await renderPdf(certificate);
  folder.createFile(pdf.name, 'application/pdf').write(await pdf.bytes());
  return true;
}
