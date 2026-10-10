/** Text helpers for picking Russian words out of the tutor's lines. Pure, no React. */

const WORD = /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g;

export interface Token {
  text: string;
  /** True for a Russian word that can be tapped; false for spaces, punctuation and emoji. */
  word: boolean;
}

export const normalizeWord = (word: string): string => word.trim().toLowerCase();

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    if (start > last) tokens.push({ text: text.slice(last, start), word: false });
    tokens.push({ text: match[0], word: true });
    last = start + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), word: false });
  return tokens;
}

/** The sentence of `text` that contains `word` (the whole text if it cannot be told apart). */
export function sentenceOf(text: string, word: string): string {
  const target = normalizeWord(word);
  const sentences = text.match(/[^.!?…]+[.!?…]*/g) ?? [text];
  const found = sentences.find((sentence) => sentence.toLowerCase().includes(target));
  return (found ?? text).trim();
}

/** The sentence with `word` replaced by a blank, or null when the word is not in it. */
export function maskWord(sentence: string, word: string, blank = '_____'): string | null {
  const index = sentence.toLowerCase().indexOf(normalizeWord(word));
  if (index < 0) return null;
  return sentence.slice(0, index) + blank + sentence.slice(index + word.length);
}
