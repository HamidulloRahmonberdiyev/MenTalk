import { AppText } from '@/components/ui/AppText';
import { usePalette } from '@/theme/appearance';

interface HighlightedTextProps {
  text: string;
  mark: string;
  markColor: string;
}

/** Renders `text` with the first occurrence of `mark` emphasized. */
export function HighlightedText({ text, mark, markColor }: HighlightedTextProps) {
  const home = usePalette();
  const index = mark ? text.indexOf(mark) : -1;
  if (index === -1) return <AppText variant="bodyStrong">{text}</AppText>;

  return (
    <AppText variant="bodyStrong" color={home.text}>
      {text.slice(0, index)}
      <AppText variant="bodyStrong" color={markColor}>
        {mark}
      </AppText>
      {text.slice(index + mark.length)}
    </AppText>
  );
}
