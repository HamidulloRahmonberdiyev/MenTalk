export interface ParsedBirth {
  iso: string;
  age: number;
}

const MIN_AGE = 4;
const MAX_AGE = 110;

/** Returns null unless the three parts form a real calendar date with a plausible age. */
export function parseBirthDate(day: string, month: string, year: string, now = new Date()): ParsedBirth | null {
  if (year.length !== 4 || !day || !month) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;

  let age = now.getFullYear() - y;
  if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age -= 1;
  if (age < MIN_AGE || age > MAX_AGE) return null;

  const pad = (value: number) => `${value}`.padStart(2, '0');
  return { iso: `${y}-${pad(m)}-${pad(d)}`, age };
}
