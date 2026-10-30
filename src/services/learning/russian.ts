import type { StudyLanguagePack } from './types';

export const russian: StudyLanguagePack = {
  id: 'ru',
  name: 'Russian',
  tutorName: 'Anna',
  speechTag: 'ru-RU',
  scriptNote: ' (Cyrillic)',
  wordPattern: /[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g,
  scenarioBriefs: {
    intro: 'Two people meeting for the first time at a friendly event. You are Anna, getting to know the learner: name, where they are from, work or studies, hobbies.',
    cafe: "A café in Moscow. You are Anna, the waitress. Take the learner's order: drinks, food, dessert, then payment (card or cash).",
    shop: 'A clothing and grocery store. You are Anna, the shop assistant. Help the learner find things, answer questions about sizes, prices, payment.',
    taxi: 'A taxi ride. You are Anna, the driver. Ask where to go, discuss the route, the address, how long it takes and how to pay.',
    work: "An office. You are Anna, a friendly colleague. Small talk, today's tasks, a meeting, plans for the week.",
    airport: 'An airport. You are Anna, the check-in and passport-control officer. Check-in, luggage, documents, boarding, the purpose of the trip.',
  },
  followUpExamples: '"А у вас как?", "Расскажете подробнее?"',
  tutorRules: ['- Address the learner politely with "вы" unless they clearly prefer informal speech.'],
  basicWords: 'привет, да, нет',
  dictionaryForm: 'infinitive, nominative singular',
};
