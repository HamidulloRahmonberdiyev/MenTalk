import { Fragment, useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { TypographyVariant } from '@/theme';
import { usePalette } from '@/theme/appearance';

import { diffSegments } from './diff';

interface SentenceDiffProps {
  said: string;
  correct: string;
  /** Which of the two to draw; the other is only there to find what changed. */
  side: 'said' | 'correct';
  /**
   * `verdict` (default): struck in red as said, bold green as right. `neutral`: the changed words
   * only underlined, for a question that must not give away which sentence is the right one.
   */
  tone?: 'verdict' | 'neutral';
  variant?: TypographyVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** A sentence with the words the correction changed picked out. */
export function SentenceDiff({ said, correct, side, tone = 'verdict', variant = 'bodyStrong', color, style }: SentenceDiffProps) {
  const home = usePalette();
  const segments = useMemo(() => diffSegments(said, correct)[side], [said, correct, side]);
  const mark: TextStyle =
    tone === 'neutral'
      ? { fontWeight: '800', textDecorationLine: 'underline' }
      : side === 'said'
        ? { color: home.dangerInk, textDecorationLine: 'line-through', backgroundColor: home.dangerFill }
        : { color: home.successInk, fontWeight: '800', backgroundColor: home.successFill };

  const ink = color ?? (side === 'said' && tone === 'verdict' ? home.textSecondary : home.text);

  return (
    <AppText variant={variant} color={ink} style={style}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? ' ' : ''}
          {/* AppText always sets a colour, so the mark is given the sentence's own; `verdict` overrides it. */}
          {segment.changed ? (
            <AppText variant={variant} color={ink} style={mark}>
              {segment.text}
            </AppText>
          ) : (
            segment.text
          )}
        </Fragment>
      ))}
    </AppText>
  );
}
