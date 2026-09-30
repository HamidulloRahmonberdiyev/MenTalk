import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme';

interface HighlightedTextProps {
  text: string;
  mark: string;
  markColor: string;
}

/** Renders `text` with the first occurrence of `mark` emphasized. */
export function HighlightedText({ text, mark, markColor }: HighlightedTextProps) {
  const index = mark ? text.indexOf(mark) : -1;
  if (index === -1) return <AppText variant="bodyStrong">{text}</AppText>;

  return (
    <AppText variant="bodyStrong" color={colors.text}>
      {text.slice(0, index)}
      <AppText variant="bodyStrong" color={markColor}>
        {mark}
      </AppText>
      {text.slice(index + mark.length)}
    </AppText>
  );
}
