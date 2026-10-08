/** Emoji, pictographs, flags, keycaps and the joiners/selectors that glue them together. */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}\u{20E3}]/gu;

/** The line without emojis, for speech engines that would read them out or stumble on them. */
export function stripEmoji(text: string): string {
  return text.replace(EMOJI, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.!?…])/g, '$1').trim();
}
