import type { ImageSourcePropType } from 'react-native';

import { en } from '@/i18n/locales/en';
import { ru } from '@/i18n/locales/ru';
import { uz } from '@/i18n/locales/uz';
import { STUDY_LANGUAGES } from '@/services/learning';
import type { BundledScenarioId, IconName, Scenario } from '@/types';

function bundled(
  id: BundledScenarioId,
  image: ImageSourcePropType,
  icon: IconName,
  tint: string,
  gradient: readonly [string, string],
): Scenario {
  const title = `scenario.${id}.title` as const;
  const subtitle = `scenario.${id}.subtitle` as const;
  return {
    id,
    image,
    icon,
    tint,
    gradient,
    title: { uz: uz[title], ru: ru[title], en: en[title] },
    subtitle: { uz: uz[subtitle], ru: ru[subtitle], en: en[subtitle] },
    languages: STUDY_LANGUAGES,
  };
}

/** The topics a first launch shows before the server has answered, and all there is without a server. */
export const SCENARIOS: readonly Scenario[] = [
  bundled('intro', require('../../assets/scenarios/intro.jpg'), 'people', '#2AABEE', ['#5CC3F2', '#1E88C7']),
  bundled('cafe', require('../../assets/scenarios/cafe.jpg'), 'cafe', '#EF5B4C', ['#B07A50', '#4A2F1F']),
  bundled('shop', require('../../assets/scenarios/shop.jpg'), 'cart', '#22B573', ['#4FCB8F', '#137A4C']),
  bundled('taxi', require('../../assets/scenarios/taxi.jpg'), 'car', '#F5A524', ['#FBC658', '#C77A0B']),
  bundled('work', require('../../assets/scenarios/work.jpg'), 'briefcase', '#5A8DEE', ['#7FA8F5', '#2F5FC4']),
  bundled('airport', require('../../assets/scenarios/airport.jpg'), 'airplane', '#17B2D6', ['#5CC3F2', '#0A6796']),
];
