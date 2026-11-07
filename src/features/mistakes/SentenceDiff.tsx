import { Fragment, useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { TypographyVariant } from '@/theme';
import { usePalette } from '@/theme/appearance';

import { diffSegments } from './drills';

interface SentenceDiffProps {
  said: string;
  correct: string;
  /** Which of the two to draw; the other is only there to find what changed. */
  side: 'said' | 'correct';
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
}

/** A sentence with the words the correction changed picked out: struck in red as said, bold green as right. */
export function SentenceDiff({ said, correct, side, variant = 'bodyStrong', style }: SentenceDiffProps) {
  const home = usePalette();
  const segments = useMemo(() => diffSegments(said, correct)[side], [said, correct, side]);
  const mark: TextStyle =
    side === 'said'
      ? { color: home.dangerInk, textDecorationLine: 'line-through', backgroundColor: home.dangerFill }
      : { color: home.successInk, fontWeight: '800', backgroundColor: home.successFill };

  return (
    <AppText variant={variant} color={side === 'said' ? home.textSecondary : home.text} style={style}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? ' ' : ''}
          {segment.changed ? <AppText variant={variant} style={mark}>{segment.text}</AppText> : segment.text}
        </Fragment>
      ))}
    </AppText>
  );
}
