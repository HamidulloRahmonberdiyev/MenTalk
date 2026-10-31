import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { TranslationResult } from '@/types';

interface ResultDetailsProps {
  result: TranslationResult;
  /** Called when the user taps a meaning or alternative, to copy / hear / use it. */
  onPick: (text: string) => void;
}

/** Word meanings with examples, and other natural ways to say the same thing. */
export function ResultDetails({ result, onPick }: ResultDetailsProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const { meanings, alternatives } = result;

  return (
    <>
      {meanings.length > 0 ? (
        <Section title={t('translate.meanings')}>
          {meanings.map((meaning, index) => (
            <Item key={`${meaning.translation}-${index}`} label={meaning.translation} onPress={() => onPick(meaning.translation)}>
              <View style={styles.itemHead}>
                <AppText variant="subheading" color={home.text} style={styles.flex}>
                  {meaning.translation}
                </AppText>
                <Tag>{meaning.partOfSpeech}</Tag>
              </View>
              {meaning.example ? (
                <View style={styles.example}>
                  <AppText variant="caption" color={home.textMuted}>
                    {meaning.example.source}
                  </AppText>
                  <AppText variant="caption" color={home.text}>
                    {meaning.example.target}
                  </AppText>
                </View>
              ) : null}
            </Item>
          ))}
        </Section>
      ) : null}

      {alternatives.length > 0 ? (
        <Section title={t('translate.alternatives')}>
          {alternatives.map((item, index) => (
            <Item key={`${item.text}-${index}`} label={item.text} onPress={() => onPick(item.text)}>
              <View style={styles.itemHead}>
                <AppText variant="bodyStrong" color={home.text} style={styles.flex}>
                  {item.text}
                </AppText>
                <Tag>{t(`translate.register.${item.register}`)}</Tag>
              </View>
            </Item>
          ))}
        </Section>
      ) : null}
    </>
  );
}

function Item({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D accessibilityRole="button" accessibilityLabel={label} onPress={onPress} edgeColor={home.rim} depth={4} radius={radii.lg} faceStyle={styles.item}>
      {children}
    </Pressable3D>
  );
}

function Tag({ children }: { children: string }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.tag}>
      <AppText variant="captionStrong" color={home.accent}>
        {children}
      </AppText>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <AppText variant="heading" color={home.text} accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    section: { gap: spacing.md, marginTop: spacing.sm },
    sectionTitle: { fontWeight: '800' },
    list: { gap: spacing.md },
    flex: { flex: 1 },
    item: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: home.rim,
      backgroundColor: home.selected,
    },
    example: { gap: 2, paddingLeft: spacing.md, borderLeftWidth: 3, borderLeftColor: home.rim },
  });
