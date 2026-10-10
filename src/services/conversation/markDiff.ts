/** The part of `text` that differs from `other`, found by trimming the shared start and end. */
export function differingPart(text: string, other: string): string {
  let start = 0;
  while (start < text.length && start < other.length && text[start] === other[start]) start += 1;
  let end = 0;
  while (end < text.length - start && end < other.length - start && text[text.length - 1 - end] === other[other.length - 1 - end]) end += 1;
  const part = text.slice(start, text.length - end).trim();
  return part || text;
}
