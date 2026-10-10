import type { Language } from '@/i18n';
import type { WordSuggestion } from '@/types';

interface StarterWord {
  word: string;
  /** The form that appears in `example`, when it differs from `word`. */
  form?: string;
  example: string;
  gloss: Record<Language, string>;
}

/** Everyday words for a first game, so the learner can play before any chat has produced words. */
const STARTER_WORDS: readonly StarterWord[] = [
  { word: 'привет', example: 'Привет! Как дела?', gloss: { uz: 'salom', en: 'hi', ru: 'приветствие при встрече' } },
  { word: 'спасибо', example: 'Большое спасибо!', gloss: { uz: 'rahmat', en: 'thank you', ru: 'слово благодарности' } },
  { word: 'пожалуйста', example: 'Кофе, пожалуйста.', gloss: { uz: 'iltimos', en: 'please', ru: 'вежливая просьба' } },
  { word: 'извините', example: 'Извините, где станция?', gloss: { uz: 'kechirasiz', en: 'excuse me', ru: 'вежливое обращение' } },
  { word: 'вода', form: 'воду', example: 'Я хочу воду.', gloss: { uz: 'suv', en: 'water', ru: 'жидкость, которую пьют' } },
  { word: 'кофе', example: 'Один кофе, пожалуйста.', gloss: { uz: 'qahva', en: 'coffee', ru: 'бодрящий горячий напиток' } },
  { word: 'хлеб', example: 'Это свежий хлеб.', gloss: { uz: 'non', en: 'bread', ru: 'основная выпечка' } },
  { word: 'дом', example: 'Мой дом далеко.', gloss: { uz: 'uy', en: 'house', ru: 'здание, где живут' } },
  { word: 'друг', example: 'Это мой друг.', gloss: { uz: 'do‘st', en: 'friend', ru: 'близкий человек' } },
  { word: 'город', example: 'Это большой город.', gloss: { uz: 'shahar', en: 'city', ru: 'большое поселение' } },
  { word: 'сколько', example: 'Сколько это стоит?', gloss: { uz: 'qancha', en: 'how much', ru: 'вопрос о цене или числе' } },
  { word: 'где', example: 'Где здесь аптека?', gloss: { uz: 'qayerda', en: 'where', ru: 'вопрос о месте' } },
  { word: 'хорошо', example: 'Всё хорошо.', gloss: { uz: 'yaxshi', en: 'good, well', ru: 'в порядке, отлично' } },
  { word: 'можно', example: 'Можно воды?', gloss: { uz: 'mumkin', en: 'may I, allowed', ru: 'разрешено' } },
  { word: 'понимать', form: 'понимаю', example: 'Я не понимаю.', gloss: { uz: 'tushunmoq', en: 'to understand', ru: 'осознавать смысл' } },
];

export function starterWords(language: Language): WordSuggestion[] {
  return STARTER_WORDS.map(({ word, form, example, gloss }) => ({ word, form, example, translation: gloss[language] }));
}
