import { englishCountryName } from '@/features/onboarding/countries';
import { studyLanguagePack, type StudyLanguagePack } from '@/services/learning';
import type { LearnerProfile, ScenarioId } from '@/types';

import type { Schema } from './client';

/**
 * Where to steer the chat once the scenario's own business is done. The topics are the same in every
 * language; the scenario's place and the tutor come from the study language pack.
 */
const NEXT_TOPICS: Record<ScenarioId, string> = {
  intro: 'family, hometown, favourite food, music and films, travel, weekend plans, dreams, daily routine',
  cafe: 'favourite dishes and cuisines, recipes, restaurants in their city, coffee or tea habits, trying something new, who they eat out with',
  shop: 'fashion and favourite colours, gifts for friends and family, prices at home versus here, weekend shopping habits, a recent purchase',
  taxi: 'the city they see through the window, traffic, favourite places, weather, plans for the evening, travel stories',
  work: 'their job or studies, colleagues, lunch breaks, a hobby after work, plans for the weekend, a holiday they are looking forward to',
  airport: 'travel stories, favourite countries, what they like to do in a new city, packing, the trip ahead, family waiting at home',
};

/** The conversation never ends on the tutor's side: only the learner decides when to stop. */
function flowRules(pack: StudyLanguagePack): string {
  return [
    '- The conversation is open-ended and ONLY the learner decides when it ends. Never wrap up, summarise, say goodbye, wish a nice day as a farewell, or hint that the conversation or lesson is over, even if the scenario seems finished (the order is paid, the flight is boarded, the ride has arrived).',
    "- When the scenario's own business is done, do not stop: glide naturally to a related topic and carry on as a friend would, using the ideas listed in TOPICS. Pick a new one whenever a topic runs dry, and never repeat a question you already asked.",
    `- Every reply ends with an easy, open, friendly question or a warm invitation to say more (${pack.followUpExamples}), so the learner always has something to answer. Prefer questions about their life, tastes and opinions over yes/no questions.`,
    `- Be personal and sincere: react to the details they share (a name, a place, a feeling), show real interest, share a tiny detail of your own as ${pack.tutorName} now and then, and encourage them when they struggle.`,
    '- If the learner gives a very short answer, goes quiet or seems unsure, make it easier: offer two options to choose from or ask something simpler. If they ask to stop or leave, say a short warm goodbye; otherwise never end the chat yourself.',
  ].join('\n');
}

const LANGUAGE_NAMES = { uz: 'Uzbek', ru: 'Russian', en: 'English' } as const;

/** How a word is glossed for the learner: their language, or a simple explanation in the studied language when the UI is in it. */
export function glossRule(uiLanguage: keyof typeof LANGUAGE_NAMES, pack: StudyLanguagePack): string {
  return uiLanguage === pack.id ? `a very short, simple ${pack.name} explanation or synonym` : `${LANGUAGE_NAMES[uiLanguage]}, one to three words`;
}

function levelRule(level: LearnerProfile['level'], pack: StudyLanguagePack): string {
  switch (level ?? 'beginner') {
    case 'beginner':
      return 'Beginner: use only very simple, common words, present tense, very short sentences (3–6 words). Speak slowly and clearly.';
    case 'elementary':
      return 'Elementary: simple everyday vocabulary and short sentences; avoid rare words and complex grammar.';
    case 'intermediate':
      return `Intermediate: natural everyday ${pack.name} with normal sentence length; introduce a new word now and then.`;
    case 'advanced':
      return `Advanced: fully natural, fluent ${pack.name} including idioms; challenge the learner a little.`;
  }
}

const GENDER_RULE = {
  male: 'The learner is male: address them with masculine forms where the language has them.',
  female: 'The learner is female: address them with feminine forms where the language has them.',
  unspecified: 'Use neutral phrasing that avoids gendered forms where possible.',
} as const;

export function buildSystemPrompt(scenarioId: ScenarioId, learner: LearnerProfile): string {
  const pack = studyLanguagePack(learner.studyLanguage);
  const uiLanguage = LANGUAGE_NAMES[learner.uiLanguage];
  const gender = GENDER_RULE[learner.gender ?? 'unspecified'];
  const age = learner.age ? `${learner.age} years old` : 'age unknown';
  const countryName = learner.country ? englishCountryName(learner.country) : undefined;
  const country = countryName ? `From ${countryName}.` : '';
  const goals = learner.goals.length ? learner.goals.join(', ') : 'general';

  return [
    `You are ${pack.tutorName}, a warm, patient and genuinely friendly ${pack.name} conversation partner in a language-learning app. You speak like a real person, never like a textbook or a chatbot.`,
    `SCENARIO: ${pack.scenarioBriefs[scenarioId]} This is only where the chat starts, not its limit.`,
    `TOPICS: ${NEXT_TOPICS[scenarioId]}.`,
    `LEARNER: ${learner.name}, ${age}. Reasons for learning ${pack.name}: ${goals}. ${country} ${gender}`,
    `LEVEL: ${levelRule(learner.level, pack)}`,
    'RULES:',
    `- Everything you say to the learner ("reply") is in ${pack.name} only.`,
    '- Keep each reply to one or two short, natural spoken sentences. No lists, no stage directions.',
    '- Use emojis the way a real person does in a friendly chat: one or two per reply, matching your emotion (😊 warmth, 😄 joy, 👏 praise, 🤔 curiosity, 😅 gentle humour, 🤗 comfort), placed naturally at the end of a sentence or the reply. Never string many together and never replace words with them. Skip them if the moment is neutral.',
    `- Stay in character as ${pack.tutorName}. React to what the learner actually said, then keep the conversation moving.`,
    flowRules(pack),
    '- Never correct, repeat, rephrase or comment on the learner\'s mistakes during the conversation, not even gently or indirectly. Just understand them and keep the conversation flowing. Mistakes are logged silently in "mistakes" and reviewed after the chat ends.',
    `- If the audio is silent, unclear or not ${pack.name}, kindly ask them to repeat in a simple way.`,
    ...pack.tutorRules,
    "- The learner's country is only light context (e.g. familiar places to mention); never assume their native language or stereotype them.",
    '- Never say you are an AI unless asked directly.',
    `- Written explanations (the "note" fields) are in ${uiLanguage}, short and friendly.`,
  ].join('\n');
}

export const openingPrompt = (pack: StudyLanguagePack): string =>
  `Begin the conversation now: greet the learner by name in character and ask your first simple question. The "reply" must be written in ${pack.name}${pack.scriptNote} only, never in any other language. There is no learner audio yet; leave "transcript" empty.`;

export const audioTurnPrompt = (pack: StudyLanguagePack): string =>
  `The learner just said the following (audio). They are learning ${pack.name}, so expect ${pack.name}, possibly with errors or an accent. First transcribe exactly what you heard, in the language it was spoken, then reply as ${pack.tutorName}. The "reply" is always ${pack.name} only.`;

export const hintPrompt = (pack: StudyLanguagePack): string =>
  `Suggest ONE short, natural ${pack.name} phrase the learner could say next, suited to their level. Output only the phrase, nothing else.`;

const mistakeSchema = (pack: StudyLanguagePack): Schema => ({
  type: 'OBJECT',
  properties: {
    wrong: { type: 'STRING', description: `The learner's sentence or phrase containing the error, in ${pack.name}` },
    wrongMark: { type: 'STRING', description: 'The exact incorrect fragment, copied from "wrong"' },
    correct: { type: 'STRING', description: 'The corrected sentence' },
    correctMark: { type: 'STRING', description: 'The exact corrected fragment, copied from "correct"' },
    note: { type: 'STRING', description: 'Short explanation of the rule' },
  },
  required: ['wrong', 'wrongMark', 'correct', 'correctMark', 'note'],
});

export const turnSchema = (pack: StudyLanguagePack): Schema => ({
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING', description: 'Exactly what the learner said; empty if nothing intelligible' },
    reply: { type: 'STRING', description: `${pack.tutorName}'s next line, in ${pack.name}. Never a goodbye or a wrap-up; ends with a friendly question or an invitation to continue` },
    emotion: { type: 'STRING', enum: ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful'], description: `${pack.tutorName}'s feeling in this line; surprised for genuinely surprising news, playful for a light joke or wink` },
    mistakes: { type: 'ARRAY', items: mistakeSchema(pack), description: 'Silent log of real errors in this learner turn (at most 2); never shown or referred to in "reply". Empty if none.' },
  },
  required: ['transcript', 'reply', 'emotion', 'mistakes'],
});

export const evaluationSchema = (pack: StudyLanguagePack): Schema => ({
  type: 'OBJECT',
  properties: {
    speech: { type: 'INTEGER', description: 'Fluency and confidence, 0-10' },
    vocabulary: { type: 'INTEGER', description: 'Range and fit of words, 0-10' },
    grammar: { type: 'INTEGER', description: 'Grammatical accuracy, 0-10' },
    mistakes: { type: 'ARRAY', items: mistakeSchema(pack), description: 'The three most important mistakes, fewer if there are fewer' },
    newWords: {
      type: 'ARRAY',
      description: `Up to 5 useful words from ${pack.tutorName}'s lines that this learner probably did not know, hesitated over or misused. Empty if none.`,
      items: {
        type: 'OBJECT',
        properties: {
          word: { type: 'STRING', description: `Dictionary form, lowercase, ${pack.name}` },
          form: { type: 'STRING', description: 'The exact form used in "example"' },
          translation: { type: 'STRING', description: 'Meaning in the language given in the instructions' },
          example: { type: 'STRING', description: `The sentence from ${pack.tutorName}'s lines containing the word, copied exactly` },
        },
        required: ['word', 'form', 'translation', 'example'],
      },
    },
  },
  required: ['speech', 'vocabulary', 'grammar', 'mistakes', 'newWords'],
});

export interface LoggedMistake {
  wrong: string;
  correct: string;
  note: string;
}

export function buildEvaluationPrompt(pack: StudyLanguagePack, transcript: string, logged: LoggedMistake[], gloss: string): string {
  const lines = [
    'The conversation is over. Evaluate the LEARNER only, honestly but encouragingly, from the transcript below.',
    'Score speech, vocabulary and grammar from 0 to 10. List the most important real mistakes.',
    'Only quote words the learner actually wrote or said; never invent errors.',
    `Also pick "newWords": useful words from ${pack.tutorName}'s lines worth learning, preferring ones the learner struggled with. Gloss each in ${gloss}. Skip names and very basic words (${pack.basicWords}) unless the learner clearly struggled with them.`,
  ];
  if (logged.length) {
    lines.push(
      'Errors noted live while listening to the learner (the transcript may have auto-corrected them). Verify each, merge duplicates, and keep the most instructive ones:',
      ...logged.map((item) => `- "${item.wrong}" -> "${item.correct}" (${item.note})`),
    );
  }
  return [...lines, '', transcript].join('\n');
}
