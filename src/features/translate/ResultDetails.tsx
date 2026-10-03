import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, shadows, spacing } from '@/theme';
import type { TranslationResult } from '@/types';

interface ResultDetailsProps {
  result: TranslationResult;
  /** Called when the user taps a meaning or alternative, to copy / hear / use it. */
  onPick: (text: string) => void;
}

/** Word meanings with examples, and other natural ways to say the same thing. */
export function ResultDetails({ result, onPick }: ResultDetailsProps) {
  const t = useT();
  const { meanings, alternatives } = result;

  return (
    <>
      {meanings.length > 0 ? (
        <Section title={t('translate.meanings')}>
          {meanings.map((meaning, index) => (
            <PressableScale
              key={`${meaning.translation}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={meaning.translation}
              onPress={() => onPick(meaning.translation)}
              style={styles.item}
            >
              <View style={styles.itemHead}>
                <AppText variant="subheading" style={styles.flex}>
                  {meaning.translation}
                </AppText>
                <View style={styles.tag}>
                  <AppText variant="captionStrong" color={colors.primaryDark}>
                    {meaning.partOfSpeech}
                  </AppText>
                </View>
              </View>
              {meaning.example ? (
                <View style={styles.example}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {meaning.example.source}
                  </AppText>
                  <AppText variant="caption" color={colors.text}>
                    {meaning.example.target}
                  </AppText>
                </View>
              ) : null}
            </PressableScale>
          ))}
        </Section>
      ) : null}

      {alternatives.length > 0 ? (
        <Section title={t('translate.alternatives')}>
          {alternatives.map((item, index) => (
            <PressableScale
              key={`${item.text}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={item.text}
              onPress={() => onPick(item.text)}
              style={[styles.item, styles.itemHead]}
            >
              <AppText variant="bodyStrong" style={styles.flex}>
                {item.text}
              </AppText>
              <View style={styles.tag}>
                <AppText variant="captionStrong" color={colors.primaryDark}>
                  {t(`translate.register.${item.register}`)}
                </AppText>
              </View>
            </PressableScale>
          ))}
        </Section>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { gap: spacing.sm },
  flex: { flex: 1 },
  item: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  example: { gap: 2, paddingLeft: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primarySoft },
});
