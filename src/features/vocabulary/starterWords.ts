import type { Language } from '@/i18n';
import type { StudyLanguage } from '@/services/learning';
import type { WordSuggestion } from '@/types';

interface StarterWord {
  word: string;
  /** The form that appears in `example`, when it differs from `word`. */
  form?: string;
  example: string;
  gloss: Record<Language, string>;
}

const RUSSIAN: readonly StarterWord[] = [
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

const ENGLISH: readonly StarterWord[] = [
  { word: 'hello', example: 'Hello! How are you?', gloss: { uz: 'salom', ru: 'привет', en: 'a greeting when you meet' } },
  { word: 'thanks', example: 'Thanks a lot!', gloss: { uz: 'rahmat', ru: 'спасибо', en: 'a word of gratitude' } },
  { word: 'please', example: 'A coffee, please.', gloss: { uz: 'iltimos', ru: 'пожалуйста', en: 'a polite request' } },
  { word: 'sorry', example: 'Sorry, where is the station?', gloss: { uz: 'kechirasiz', ru: 'извините', en: 'a polite apology' } },
  { word: 'water', example: 'I would like some water.', gloss: { uz: 'suv', ru: 'вода', en: 'the drink from the tap' } },
  { word: 'coffee', example: 'One coffee, please.', gloss: { uz: 'qahva', ru: 'кофе', en: 'a hot energising drink' } },
  { word: 'bread', example: 'This bread is fresh.', gloss: { uz: 'non', ru: 'хлеб', en: 'baked food from flour' } },
  { word: 'house', example: 'My house is far away.', gloss: { uz: 'uy', ru: 'дом', en: 'a building people live in' } },
  { word: 'friend', example: 'This is my friend.', gloss: { uz: 'do‘st', ru: 'друг', en: 'a person you like and trust' } },
  { word: 'city', example: 'It is a big city.', gloss: { uz: 'shahar', ru: 'город', en: 'a large town' } },
  { word: 'how much', example: 'How much is it?', gloss: { uz: 'qancha', ru: 'сколько', en: 'a question about price' } },
  { word: 'where', example: 'Where is the pharmacy?', gloss: { uz: 'qayerda', ru: 'где', en: 'a question about place' } },
  { word: 'good', example: 'Everything is good.', gloss: { uz: 'yaxshi', ru: 'хорошо', en: 'fine, nice' } },
  { word: 'can', example: 'Can I have some water?', gloss: { uz: 'mumkin', ru: 'можно', en: 'to be able or allowed' } },
  { word: 'understand', example: "I don't understand.", gloss: { uz: 'tushunmoq', ru: 'понимать', en: 'to get the meaning' } },
];

/** Everyday words for a first game, so the learner can play before any chat has produced words. */
const STARTER_WORDS: Readonly<Record<StudyLanguage, readonly StarterWord[]>> = { ru: RUSSIAN, en: ENGLISH };

/** Starter words of `studyLanguage`, glossed in the UI language. */
export function starterWords(studyLanguage: StudyLanguage, uiLanguage: Language): WordSuggestion[] {
  return STARTER_WORDS[studyLanguage].map(({ word, form, example, gloss }) => ({
    word,
    form,
    example,
    translation: gloss[uiLanguage],
    language: studyLanguage,
  }));
}
