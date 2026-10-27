/**
 * Uzbek Latin ⇄ Cyrillic. Machine translation only reads and writes Uzbek in Latin script, so
 * Cyrillic input is converted before sending and Cyrillic output after receiving.
 */

const APOSTROPHE = "['‘’ʻʼ`]";

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н',
  o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
  sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ye: 'е', "o'": 'ў', "g'": 'ғ',
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ш: 'sh', ч: 'ch', ё: 'yo', ю: 'yu',
  я: 'ya', ў: 'o‘', ғ: 'g‘', қ: 'q', ҳ: 'h', э: 'e', ы: 'i', ъ: '’', ь: '',
};

/** Gives `converted` the case of `original`: "Sh" → "Ш", "SH" → "Ш", "sh" → "ш". */
function withCaseOf(original: string, converted: string): string {
  if (original === original.toLowerCase()) return converted;
  const allUpper = original === original.toUpperCase() && original.replace(/[^a-zа-яёўғқҳ]/gi, '').length > 1;
  return allUpper ? converted.toUpperCase() : converted.charAt(0).toUpperCase() + converted.slice(1);
}

// "yo‘l" is y + o‘ (йўл), not yo + apostrophe.
const LATIN_TOKEN = new RegExp(`sh|ch|yo(?!${APOSTROPHE})|yu|ya|ye|[og]${APOSTROPHE}|${APOSTROPHE}|[a-z]`, 'gi');

export function uzLatinToCyrillic(text: string): string {
  return text.replace(LATIN_TOKEN, (match, offset: number) => {
    const lower = match.toLowerCase().replace(new RegExp(APOSTROPHE), "'");
    // A lone apostrophe between letters is the glottal stop (tutuq belgisi).
    if (lower === "'") return /[a-z]/i.test(text[offset - 1] ?? '') ? 'ъ' : match;
    // Word-initial "e" is written "э" (eshik → эшик).
    const wordStart = !/[a-zа-яё'‘’ʻʼ`]/i.test(text[offset - 1] ?? '');
    const converted = lower === 'e' && wordStart ? 'э' : (LATIN_TO_CYRILLIC[lower] ?? match);
    return withCaseOf(match, converted);
  });
}

const VOWELS = 'аеёиоуўэюяaeiou';

export function uzCyrillicToLatin(text: string): string {
  return text.replace(/[а-яёўғқҳ]/gi, (match, offset: number) => {
    const lower = match.toLowerCase();
    const previous = (text[offset - 1] ?? '').toLowerCase();
    const wordStart = !/[a-zа-яёўғқҳ]/i.test(previous);
    let converted = CYRILLIC_TO_LATIN[lower] ?? match;
    // "е" sounds "ye" at the start of a word and after a vowel (елка → yelka), "ц" is "s" word-initially.
    if (lower === 'е') converted = wordStart || VOWELS.includes(previous) || previous === 'ъ' ? 'ye' : 'e';
    if (lower === 'ц') converted = wordStart ? 's' : 'ts';
    return withCaseOf(match, converted);
  });
}

/** Cyrillic text with letters only Uzbek uses (Kazakh shares қ and ғ but has its own letters too). */
export function looksLikeUzbekCyrillic(text: string): boolean {
  if (/[ўҳ]/i.test(text)) return true;
  return /[қғ]/i.test(text) && !/[әөүұңһі]/i.test(text);
}

export const hasCyrillic = (text: string) => /[а-яё]/i.test(text);
