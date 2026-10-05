import type { CountryCode } from '@/types';

/** ISO 3166-1 alpha-2 code to its flag emoji (two regional-indicator symbols). */
const flag = (code: string) => String.fromCodePoint(...[...code].map((char) => 0x1f1a5 + char.charCodeAt(0)));

const LISTED: readonly Exclude<CountryCode, 'OTHER'>[] = [
  'UZ', 'KZ', 'KG', 'TJ', 'TM', 'AF', 'AZ', 'TR', 'RU', 'UA',
  'BY', 'GE', 'AM', 'KR', 'DE', 'US', 'GB', 'AE', 'CN', 'IN',
];

/** Countries offered during onboarding: Russian learners' most common home countries, then "other". */
export const COUNTRIES: readonly { id: CountryCode; emoji: string }[] = [
  ...LISTED.map((id) => ({ id, emoji: flag(id) })),
  { id: 'OTHER', emoji: '🌍' },
];
