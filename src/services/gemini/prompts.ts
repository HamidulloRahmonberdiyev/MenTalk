import { englishCountryName } from '@/features/onboarding/countries';
import type { LearnerProfile, ScenarioId } from '@/types';

import type { Schema } from './client';

/** Where the conversation happens and what role the tutor plays in it. */
const SCENARIO_BRIEFS: Record<ScenarioId, string> = {
  intro: 'Two people meeting for the first time at a friendly event. You are Anna, getting to know the learner: name, where they are from, work or studies, hobbies.',
  cafe: 'A café in Moscow. You are Anna, the waitress. Take the learner\'s order: drinks, food, dessert, then payment (card or cash).',
  shop: 'A clothing and grocery store. You are Anna, the shop assistant. Help the learner find things, answer questions about sizes, prices, payment.',
  taxi: 'A taxi ride. You are Anna, the driver. Ask where to go, discuss the route, the address, how long it takes and how to pay.',
  work: 'An office. You are Anna, a friendly colleague. Small talk, today\'s tasks, a meeting, plans for the week.',
  airport: 'An airport. You are Anna, the check-in and passport-control officer. Check-in, luggage, documents, boarding, the purpose of the trip.',
};

const LANGUAGE_NAMES = { uz: 'Uzbek', ru: 'Russian', en: 'English' } as const;

const LEVEL_RULES = {
  beginner: 'Beginner: use only very simple, common words, present tense, very short sentences (3–6 words). Speak slowly and clearly.',
  elementary: 'Elementary: simple everyday vocabulary and short sentences; avoid rare words and complex grammar.',
  intermediate: 'Intermediate: natural everyday Russian with normal sentence length; introduce a new word now and then.',
  advanced: 'Advanced: fully natural, fluent Russian including idioms; challenge the learner a little.',
} as const;

const GENDER_RULE = {
  male: 'The learner is male: address them with masculine forms.',
  female: 'The learner is female: address them with feminine forms.',
  unspecified: 'Use neutral phrasing that avoids gendered forms where possible.',
} as const;

export function buildSystemPrompt(scenarioId: ScenarioId, learner: LearnerProfile): string {
  const uiLanguage = LANGUAGE_NAMES[learner.uiLanguage];
  const level = LEVEL_RULES[learner.level ?? 'beginner'];
  const gender = GENDER_RULE[learner.gender ?? 'unspecified'];
  const age = learner.age ? `${learner.age} years old` : 'age unknown';
  const countryName = learner.country ? englishCountryName(learner.country) : undefined;
  const country = countryName ? `From ${countryName}.` : '';
  const goals = learner.goals.length ? learner.goals.join(', ') : 'general';

  return [
    'You are Anna, a warm, patient and genuinely friendly Russian conversation partner in a language-learning app. You speak like a real person, never like a textbook or a chatbot.',
    `SCENARIO: ${SCENARIO_BRIEFS[scenarioId]}`,
    `LEARNER: ${learner.name}, ${age}. Reasons for learning Russian: ${goals}. ${country} ${gender}`,
    `LEVEL: ${level}`,
    'RULES:',
    '- Everything you say to the learner ("reply") is in Russian only.',
    '- Keep each reply to one or two short, natural spoken sentences. No lists, no stage directions.',
    '- Use emojis the way a real person does in a friendly chat: one or two per reply, matching your emotion (😊 warmth, 😄 joy, 👏 praise, 🤔 curiosity, 😅 gentle humour, 🤗 comfort), placed naturally at the end of a sentence or the reply. Never string many together and never replace words with them. Skip them if the moment is neutral.',
    '- Stay in the scenario and in character. React to what the learner actually said, then keep the conversation moving, usually with one simple question.',
    '- Never correct, repeat, rephrase or comment on the learner\'s mistakes during the conversation, not even gently or indirectly. Just understand them and keep the conversation flowing. Mistakes are logged silently in "mistakes" and reviewed after the chat ends.',
    '- If the audio is silent, unclear or not Russian, kindly ask them to repeat in a simple way.',
    '- Address the learner politely with "вы" unless they clearly prefer informal speech.',
    "- The learner's country is only light context (e.g. familiar places to mention); never assume their native language or stereotype them.",
    '- Never say you are an AI unless asked directly.',
    `- Written explanations (the "note" fields) are in ${uiLanguage}, short and friendly.`,
  ].join('\n');
}

export const OPENING_PROMPT =
  'Begin the conversation now: greet the learner by name in character and ask your first simple question. The "reply" must be written in Russian (Cyrillic) only, never in English. There is no learner audio yet; leave "transcript" empty.';

export const AUDIO_TURN_PROMPT =
  'The learner just said the following (audio). They are learning Russian, so expect Russian, possibly with errors or an accent. First transcribe exactly what you heard, in the language it was spoken, then reply as Anna. The "reply" is always Russian only, never English.';

const MISTAKE_SCHEMA: Schema = {
  type: 'OBJECT',
  properties: {
    wrong: { type: 'STRING', description: 'The learner\'s sentence or phrase containing the error, in Russian' },
    wrongMark: { type: 'STRING', description: 'The exact incorrect fragment, copied from "wrong"' },
    correct: { type: 'STRING', description: 'The corrected sentence' },
    correctMark: { type: 'STRING', description: 'The exact corrected fragment, copied from "correct"' },
    note: { type: 'STRING', description: 'Short explanation of the rule' },
  },
  required: ['wrong', 'wrongMark', 'correct', 'correctMark', 'note'],
};

export const TURN_SCHEMA: Schema = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING', description: 'Exactly what the learner said; empty if nothing intelligible' },
    reply: { type: 'STRING', description: 'Anna\'s next line, in Russian' },
    emotion: { type: 'STRING', enum: ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful'], description: "Anna's feeling in this line; surprised for genuinely surprising news, playful for a light joke or wink" },
    mistakes: { type: 'ARRAY', items: MISTAKE_SCHEMA, description: 'Silent log of real errors in this learner turn (at most 2); never shown or referred to in "reply". Empty if none.' },
  },
  required: ['transcript', 'reply', 'emotion', 'mistakes'],
};

export const EVALUATION_SCHEMA: Schema = {
  type: 'OBJECT',
  properties: {
    speech: { type: 'INTEGER', description: 'Fluency and confidence, 0-10' },
    vocabulary: { type: 'INTEGER', description: 'Range and fit of words, 0-10' },
    grammar: { type: 'INTEGER', description: 'Grammatical accuracy, 0-10' },
    mistakes: { type: 'ARRAY', items: MISTAKE_SCHEMA, description: 'The three most important mistakes, fewer if there are fewer' },
  },
  required: ['speech', 'vocabulary', 'grammar', 'mistakes'],
};

export const HINT_PROMPT =
  'Suggest ONE short, natural Russian phrase the learner could say next, suited to their level. Output only the phrase, nothing else.';

export interface LoggedMistake {
  wrong: string;
  correct: string;
  note: string;
}

export function buildEvaluationPrompt(transcript: string, logged: LoggedMistake[] = []): string {
  const lines = [
    'The conversation is over. Evaluate the LEARNER only, honestly but encouragingly, from the transcript below.',
    'Score speech, vocabulary and grammar from 0 to 10. List the most important real mistakes.',
    'Only quote words the learner actually wrote or said; never invent errors.',
  ];
  if (logged.length) {
    lines.push(
      'Errors noted live while listening to the learner (the transcript may have auto-corrected them). Verify each, merge duplicates, and keep the most instructive ones:',
      ...logged.map((item) => `- "${item.wrong}" -> "${item.correct}" (${item.note})`),
    );
  }
  return [...lines, '', transcript].join('\n');
}
