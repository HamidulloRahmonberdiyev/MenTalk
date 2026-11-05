import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT, type TranslationKey } from '@/i18n';
import type { ApiCertificate } from '@/services/api/endpoints';
import { radii, spacing } from '@/theme';

const NIGHT = ['#143A6B', '#0B1F3A', '#071527'] as const;
const GOLD = '#D9BE7C';
const IVORY = '#FBF8F1';
const MUTED = '#AFC0D8';

const SCORES: readonly { key: 'speaking' | 'vocabulary' | 'grammar' | 'overall'; label: TranslationKey }[] = [
  { key: 'speaking', label: 'certificate.score.speaking' },
  { key: 'vocabulary', label: 'certificate.score.vocabulary' },
  { key: 'grammar', label: 'certificate.score.grammar' },
  { key: 'overall', label: 'certificate.score.overall' },
];

/** The certificate as the app shows it; the PDF itself is drawn by the server. */
export function CertificatePreview({ certificate }: { certificate: ApiCertificate }) {
  const t = useT();
  return (
    <LinearGradient colors={NIGHT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.seal}>
          <AppText variant="heading" color={GOLD}>
            {certificate.cefr}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color={GOLD}>
            MenTalk
          </AppText>
          <AppText variant="heading" color={IVORY} numberOfLines={2}>
            {certificate.holder_name}
          </AppText>
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.scores}>
        {SCORES.map(({ key, label }) => (
          <View key={key} style={styles.score}>
            <AppText variant="subheading" color={key === 'overall' ? GOLD : IVORY}>
              {certificate[key].toFixed(1)}
            </AppText>
            <AppText variant="caption" color={MUTED} numberOfLines={1}>
              {t(label)}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="caption" color={MUTED} style={styles.serial}>
        {certificate.serial}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, padding: spacing.xl, borderRadius: radii.xl, borderWidth: 1.5, borderColor: GOLD },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  seal: { width: 64, height: 64, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: GOLD },
  flex: { flex: 1, gap: 2 },
  rule: { height: 1, backgroundColor: GOLD, opacity: 0.5 },
  scores: { flexDirection: 'row', gap: spacing.sm },
  score: { flex: 1, alignItems: 'center', gap: 2 },
  serial: { textAlign: 'center' },
});
