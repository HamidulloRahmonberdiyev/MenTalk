import { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { TypographyVariant } from '@/theme';
import { colors } from '@/theme';

import { normalizeWord, tokenize } from './words';

interface TappableTextProps {
  text: string;
  /** Normalized forms of words already saved; they are tinted so the learner sees what they know. */
  savedWords: ReadonlySet<string>;
  onWordPress: (word: string) => void;
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
}

/** Russian text in which every word can be tapped. Punctuation and emoji stay plain. */
export function TappableText({ text, savedWords, onWordPress, variant, style }: TappableTextProps) {
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <AppText variant={variant} style={style}>
      {tokens.map((token, index) =>
        token.word ? (
          <Text
            key={index}
            accessibilityRole="button"
            onPress={() => onWordPress(token.text)}
            style={savedWords.has(normalizeWord(token.text)) ? { color: colors.primaryDark } : undefined}
          >
            {token.text}
          </Text>
        ) : (
          token.text
        ),
      )}
    </AppText>
  );
}
