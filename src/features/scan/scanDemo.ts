import type { Language } from '@/i18n';

/**
 * Static stand-in for what text recognition + translation will return for a photographed page.
 * The screens only read `ScanResult`, so swapping this for a real OCR call changes nothing else.
 */

export type PartOfSpeech = 'noun' | 'verb' | 'adj' | 'adv';
export type Level = 'B1' | 'B2' | 'C1';

export interface ScannedWord {
  id: string;
  /** How the word is written on the page (lower case, no punctuation). */
  surface: string;
  /** Dictionary form saved to the word list. */
  lemma: string;
  transcription: string;
  pos: PartOfSpeech;
  level: Level;
  translation: Record<Language, string>;
  /** Already in the learner's word list: shown, but not selected for saving. */
  known?: boolean;
}

export interface ScanResult {
  title: string;
  paragraphs: string[];
  pageNumber: number;
  words: ScannedWord[];
}

export const DEMO_SCAN: ScanResult = {
  title: 'Chapter Three',
  pageNumber: 47,
  paragraphs: [
    'The morning was unusually quiet when Lena finally reached the ancient harbour. Fishermen were mending their nets, and the air smelled of salt and seaweed. She felt a strange mixture of relief and curiosity.',
    'Her grandmother had often described this place, yet nothing could prepare her for its breathtaking beauty. Lena hesitated for a moment, then stepped forward with confidence.',
  ],
  words: [
    { id: 'unusually', surface: 'unusually', lemma: 'unusually', transcription: 'ʌnˈjuːʒuəli', pos: 'adv', level: 'B2', translation: { uz: 'g‘ayrioddiy darajada', ru: 'необычайно', en: 'in a way that is not usual' } },
    { id: 'ancient', surface: 'ancient', lemma: 'ancient', transcription: 'ˈeɪnʃənt', pos: 'adj', level: 'B1', translation: { uz: 'qadimiy', ru: 'древний', en: 'very old' }, known: true },
    { id: 'harbour', surface: 'harbour', lemma: 'harbour', transcription: 'ˈhɑːbə', pos: 'noun', level: 'B2', translation: { uz: 'bandargoh', ru: 'гавань', en: 'a sheltered place for boats' } },
    { id: 'mending', surface: 'mending', lemma: 'mend', transcription: 'mend', pos: 'verb', level: 'B2', translation: { uz: 'tuzatmoq, yamamoq', ru: 'чинить', en: 'to repair' } },
    { id: 'seaweed', surface: 'seaweed', lemma: 'seaweed', transcription: 'ˈsiːwiːd', pos: 'noun', level: 'B2', translation: { uz: 'dengiz o‘ti', ru: 'водоросли', en: 'plants that grow in the sea' } },
    { id: 'mixture', surface: 'mixture', lemma: 'mixture', transcription: 'ˈmɪkstʃə', pos: 'noun', level: 'B1', translation: { uz: 'aralashma', ru: 'смесь', en: 'a combination of things' } },
    { id: 'relief', surface: 'relief', lemma: 'relief', transcription: 'rɪˈliːf', pos: 'noun', level: 'B1', translation: { uz: 'yengillik', ru: 'облегчение', en: 'a feeling of comfort after worry' }, known: true },
    { id: 'curiosity', surface: 'curiosity', lemma: 'curiosity', transcription: 'ˌkjʊəriˈɒsəti', pos: 'noun', level: 'B2', translation: { uz: 'qiziqish', ru: 'любопытство', en: 'a wish to know something' } },
    { id: 'described', surface: 'described', lemma: 'describe', transcription: 'dɪˈskraɪb', pos: 'verb', level: 'B1', translation: { uz: 'tasvirlamoq', ru: 'описывать', en: 'to say what something is like' } },
    { id: 'breathtaking', surface: 'breathtaking', lemma: 'breathtaking', transcription: 'ˈbreθteɪkɪŋ', pos: 'adj', level: 'C1', translation: { uz: 'hayratlanarli', ru: 'захватывающий дух', en: 'extremely beautiful' } },
    { id: 'hesitated', surface: 'hesitated', lemma: 'hesitate', transcription: 'ˈhezɪteɪt', pos: 'verb', level: 'B2', translation: { uz: 'ikkilanmoq', ru: 'колебаться', en: 'to pause before acting' } },
    { id: 'confidence', surface: 'confidence', lemma: 'confidence', transcription: 'ˈkɒnfɪdəns', pos: 'noun', level: 'B1', translation: { uz: 'ishonch', ru: 'уверенность', en: 'a feeling of being sure' } },
  ],
};

/** A page token's lookup key: lower case, with surrounding punctuation dropped. */
export const tokenKey = (token: string) => token.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
