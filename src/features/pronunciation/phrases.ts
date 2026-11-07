import type { StudyLanguage } from '@/services/learning';

export type PhraseLevel = 'easy' | 'medium' | 'hard';
export const PHRASE_LEVELS: readonly PhraseLevel[] = ['easy', 'medium', 'hard'];

/**
 * Built-in practice lines, used only without a server (offline, signed out, no API configured).
 * The server serves the same lines as the start of a shared pool that grows with AI-written ones;
 * keep them in step with `StarterPhrases` there.
 *
 * Practice lines per language, picked to drill the sounds learners from Uzbek and Russian miss most:
 * English th / w–v / r / short–long vowels; Russian ы / soft consonants / щ / unstressed о.
 */
const PHRASES: Record<StudyLanguage, Record<PhraseLevel, readonly string[]>> = {
  en: {
    easy: ['Thank you very much.', 'I think so.', 'What is the weather like?', 'This is my brother.', 'Three thin trees.', 'I would like water.', 'Very well, thanks.', 'Right or wrong?'],
    medium: [
      'I usually walk to work in the morning.',
      'Could you show me the way to the station?',
      'The weather was warmer than we thought.',
      'I would rather visit my village this weekend.',
      'She bought a new phone yesterday.',
      'Their house is near the river.',
      'Thirty thousand people were there.',
      'I live in a little flat with a view.',
    ],
    hard: [
      'The thirty-three thieves thought that they thrilled the throne throughout Thursday.',
      'Which witch wished which wicked wish?',
      'Red lorry, yellow lorry, red lorry, yellow lorry.',
      'I thought a thought, but the thought I thought was not the thought I thought I thought.',
      'Rural juries rarely worry about the weather.',
      'Whether the weather is warm or whether the weather is cold, we will weather the weather.',
    ],
  },
  ru: {
    easy: ['Спасибо большое.', 'Как вас зовут?', 'Мы были дома.', 'Где здесь вокзал?', 'Очень хорошо.', 'Мне нужна помощь.', 'Сколько это стоит?', 'Добрый вечер!'],
    medium: [
      'Я хочу заказать столик на двоих.',
      'Вы не подскажете, где ближайшая аптека?',
      'Сегодня на улице очень холодно.',
      'Мой брат живёт в большом городе.',
      'Извините, я опоздал на поезд.',
      'Мы будем ждать вас в пятницу.',
      'Она любит читать интересные книги.',
      'Пожалуйста, говорите помедленнее.',
    ],
    hard: [
      'Шла Саша по шоссе и сосала сушку.',
      'Щётка и щука ищут щенка в роще.',
      'Сыр, рыба и мыло были в магазине.',
      'Карл у Клары украл кораллы, а Клара у Карла украла кларнет.',
      'Ехал Грека через реку, видит Грека — в реке рак.',
      'Во дворе трава, на траве дрова.',
    ],
  },
};

export function phrasesFor(language: StudyLanguage, level: PhraseLevel): readonly string[] {
  return PHRASES[language][level];
}
