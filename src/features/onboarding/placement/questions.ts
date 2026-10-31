import type { StudyLanguage } from '@/services/learning';

/**
 * One gap-fill or reply question, written entirely in the studied language so it needs no
 * translation. `options[0]` is the right answer; the screen shuffles them.
 */
export interface PlacementQuestion {
  /** `___` marks the gap. A leading "— " line is a dialogue the learner completes. */
  prompt: string;
  options: readonly [string, string, string, string];
}

/**
 * Three bands of four questions, easiest first. Each band checks whether the learner reaches the
 * next level: elementary (A2), intermediate (B1), advanced (B2).
 */
export const PLACEMENT_BANK: Record<StudyLanguage, readonly (readonly PlacementQuestion[])[]> = {
  en: [
    [
      { prompt: 'I ___ from Uzbekistan.', options: ['am', 'is', 'are', 'be'] },
      { prompt: 'She ___ two brothers.', options: ['has', 'have', 'is', 'having'] },
      { prompt: '— Where ___ you live?\n— In Tashkent.', options: ['do', 'does', 'are', 'is'] },
      { prompt: '— Thank you very much!\n— ___', options: ['You’re welcome.', 'Yes, please.', 'I’m fine.', 'Nice to meet you.'] },
    ],
    [
      { prompt: 'Yesterday we ___ to the cinema.', options: ['went', 'go', 'have gone', 'were go'] },
      { prompt: 'I’ve lived here ___ 2019.', options: ['since', 'for', 'from', 'during'] },
      { prompt: 'If it rains tomorrow, we ___ at home.', options: ['will stay', 'stayed', 'would stay', 'are staying to'] },
      { prompt: 'This is the ___ film I’ve ever seen.', options: ['best', 'better', 'most good', 'goodest'] },
    ],
    [
      { prompt: 'By the time we arrived, the train ___.', options: ['had already left', 'already leaves', 'has already left', 'was already leave'] },
      { prompt: 'I wish I ___ more time to travel.', options: ['had', 'have', 'will have', 'am having'] },
      { prompt: 'She suggested ___ a taxi.', options: ['taking', 'to take', 'take', 'that taking'] },
      { prompt: 'The meeting was ___ off because the manager was ill.', options: ['called', 'put', 'taken', 'run'] },
    ],
  ],
  ru: [
    [
      { prompt: 'Меня ___ Анна.', options: ['зовут', 'зовёт', 'имя', 'называю'] },
      { prompt: 'Я ___ в Ташкенте.', options: ['живу', 'живёт', 'живут', 'жить'] },
      { prompt: '— Как дела?\n— ___', options: ['Хорошо, спасибо!', 'Меня зовут Али.', 'До свидания!', 'Мне двадцать лет.'] },
      { prompt: 'Это ___ книга.', options: ['моя', 'мой', 'моё', 'мои'] },
    ],
    [
      { prompt: 'Вчера я ___ в магазин.', options: ['ходил', 'хожу', 'пойду', 'ходить'] },
      { prompt: 'У меня нет ___.', options: ['брата', 'брат', 'брату', 'братом'] },
      { prompt: 'Я люблю гулять ___ парку.', options: ['по', 'в', 'на', 'из'] },
      { prompt: 'Мы встретимся ___ пять часов.', options: ['в', 'на', 'по', 'за'] },
    ],
    [
      { prompt: 'Если бы я знал, я бы тебе ___.', options: ['сказал', 'скажу', 'говорю', 'сказать'] },
      { prompt: 'Он подошёл ___ окну.', options: ['к', 'в', 'до', 'на'] },
      { prompt: 'Книга, ___ ты мне дал, очень интересная.', options: ['которую', 'которая', 'которой', 'который'] },
      { prompt: 'Вчера я весь вечер ___ письмо.', options: ['писал', 'написал', 'пишу', 'напишу'] },
    ],
  ],
};
