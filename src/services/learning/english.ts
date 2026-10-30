import type { StudyLanguagePack } from './types';

export const english: StudyLanguagePack = {
  id: 'en',
  name: 'English',
  tutorName: 'Emma',
  speechTag: 'en-GB',
  scriptNote: '',
  wordPattern: /[A-Za-z]+(?:['’-][A-Za-z]+)*/g,
  scenarioBriefs: {
    intro: 'Two people meeting for the first time at a friendly event in London. You are Emma, getting to know the learner: name, where they are from, work or studies, hobbies.',
    cafe: "A café in London. You are Emma, the waitress. Take the learner's order: drinks, food, dessert, then payment (card or cash).",
    shop: 'A clothing and grocery store in London. You are Emma, the shop assistant. Help the learner find things, answer questions about sizes, prices, payment.',
    taxi: 'A London taxi ride. You are Emma, the driver. Ask where to go, discuss the route, the address, how long it takes and how to pay.',
    work: "An office in London. You are Emma, a friendly colleague. Small talk, today's tasks, a meeting, plans for the week.",
    airport: 'Heathrow Airport. You are Emma, the check-in and passport-control officer. Check-in, luggage, documents, boarding, the purpose of the trip.',
  },
  followUpExamples: '"How about you?", "Tell me more?"',
  tutorRules: ['- Use natural British English spelling and everyday expressions; a warm, friendly tone with first names is fine.'],
  basicWords: 'hello, yes, no',
  dictionaryForm: 'base form: infinitive without "to", singular noun',
};
