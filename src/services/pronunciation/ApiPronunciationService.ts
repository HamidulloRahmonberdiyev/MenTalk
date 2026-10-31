import { File } from 'expo-file-system';

import { endpoints } from '@/services/api/endpoints';

import { deleteRecording } from './tempAudio';
import { alignWords, type AssessRequest, type PronunciationResult, type PronunciationService } from './types';

/**
 * One multipart request per attempt: the recording streams from disk (no base64 inflation) and the
 * server answers with word scores and, only when there are mistakes, their explanations.
 */
export class ApiPronunciationService implements PronunciationService {
  async assess({ audioUri, reference, language, uiLanguage, signal }: AssessRequest): Promise<PronunciationResult> {
    try {
      const form = new FormData();
      form.append('audio', new File(audioUri));
      form.append('reference', reference);
      form.append('language', language);
      form.append('ui_language', uiLanguage);
      const result = await endpoints.assessPronunciation(form, signal);
      return {
        score: Math.round(result.score),
        words: alignWords(reference, result.words.map(({ word, score, error_type }) => ({ word, score, omitted: error_type === 'Omission' }))),
        tips: result.tips.slice(0, 2).map(({ word, sound, problem, how_to }) => ({ word, sound: sound ?? undefined, problem, howTo: how_to })),
        newWords: (result.new_words ?? []).map(({ word, form, translation }) => ({
          word: word.toLocaleLowerCase(),
          translation,
          language,
          example: reference,
          form: form && form.toLocaleLowerCase() !== word.toLocaleLowerCase() ? form : undefined,
        })),
      };
    } finally {
      deleteRecording(audioUri);
    }
  }
}
