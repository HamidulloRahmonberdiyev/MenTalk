import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT, type TranslationKey } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import { endpoints, type ApiSupportTicket, type SupportCategory, type SupportStatus } from '@/services/api/endpoints';
import { ApiError } from '@/services/api/http';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing, typography } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

const CATEGORIES: { key: SupportCategory; icon: IconName; tint: string }[] = [
  { key: 'bug', icon: 'bug', tint: '#FF4B4B' },
  { key: 'idea', icon: 'bulb', tint: '#FFC800' },
  { key: 'question', icon: 'help-circle', tint: '#1CB0F6' },
  { key: 'other', icon: 'chatbubble-ellipses', tint: '#CE82FF' },
];

const STATUS_TINT: Record<SupportStatus, string> = { new: '#FF9600', in_progress: '#1CB0F6', resolved: '#58CC02' };

/** A message to the team: what kind, what happened, how to reach back; the device details go along by themselves. */
export function SupportScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const uiLanguage = useSettingsStore((state) => state.language);

  const [category, setCategory] = useState<SupportCategory>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);

  const loadTickets = () => {
    if (!isApiConfigured) return;
    endpoints.supportTickets().then(setTickets, () => undefined);
  };
  useEffect(loadTickets, []);

  const length = message.trim().length;
  const valid = length >= MIN_LENGTH;

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    try {
      await endpoints.sendSupportTicket({
        category,
        message: message.trim(),
        contact: contact.trim() || undefined,
        app_version: Constants.expoConfig?.version,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        os_version: String(Platform.Version).slice(0, 32),
        ui_language: uiLanguage,
      });
      haptics.success();
      setSent(true);
      setMessage('');
      setContact('');
      loadTickets();
    } catch (caught) {
      haptics.error();
      setError(t(caught instanceof ApiError && caught.status === 429 ? 'support.tooMany' : 'support.failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ScreenHeader title={t('support.title')} onBack={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            <Animated.View entering={enter.pop()} style={styles.success}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark" size={44} color="#FFFFFF" />
              </View>
              <AppText variant="heading" color={home.text} style={styles.center}>
                {t('support.sent.title')}
              </AppText>
              <AppText color={home.textSecondary} style={styles.center}>
                {t('support.sent.text')}
              </AppText>
              <Button title={t('support.again')} variant="soft" icon="create" onPress={() => setSent(false)} style={styles.stretch} />
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={enter.rise(0)} style={styles.heroOuter}>
                <LinearGradient colors={['#6FA8E8', '#2F6DBF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                  <View style={styles.heroArt} pointerEvents="none">
                    <Ionicons name="chatbubbles" size={120} color="rgba(255,255,255,0.22)" />
                  </View>
                  <View style={styles.heroIcon}>
                    <Ionicons name="headset" size={26} color="#2F6DBF" />
                  </View>
                  <AppText color="#FFFFFF" style={styles.heroText}>
                    {t('support.lead')}
                  </AppText>
                </LinearGradient>
              </Animated.View>

              <Animated.View entering={enter.rise(60)} style={styles.section}>
                <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
                  {t('support.category')}
                </AppText>
                <View style={styles.categories} accessibilityRole="radiogroup">
                  {CATEGORIES.map((option) => {
                    const selected = option.key === category;
                    return (
                      <Pressable3D
                        key={option.key}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => {
                          haptics.selection();
                          setCategory(option.key);
                        }}
                        edgeColor={selected ? '#1A84BF' : home.rimBottom}
                        depth={4}
                        radius={radii.md}
                        style={styles.category}
                        faceStyle={[styles.categoryFace, selected && styles.categorySelected]}
                      >
                        <View style={[styles.categoryIcon, { backgroundColor: `${option.tint}22` }]}>
                          <Ionicons name={option.icon} size={20} color={option.tint} />
                        </View>
                        <AppText variant="bodyStrong" color={selected ? home.accent : home.text} numberOfLines={1} style={styles.flex}>
                          {t(`support.cat.${option.key}` as TranslationKey)}
                        </AppText>
                      </Pressable3D>
                    );
                  })}
                </View>
              </Animated.View>

              <Animated.View entering={enter.rise(120)} style={styles.section}>
                <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
                  {t('support.message')}
                </AppText>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t('support.messagePlaceholder')}
                  placeholderTextColor={home.textMuted}
                  selectionColor={colors.primary}
                  multiline
                  maxLength={MAX_LENGTH}
                  textAlignVertical="top"
                  accessibilityLabel={t('support.message')}
                  style={[styles.input, styles.textarea]}
                />
                <View style={styles.counterRow}>
                  <AppText variant="caption" color={valid || length === 0 ? home.textMuted : '#FF9600'}>
                    {valid ? ' ' : t('support.minLength', { n: MIN_LENGTH })}
                  </AppText>
                  <AppText variant="caption" color={home.textMuted}>
                    {`${message.length}/${MAX_LENGTH}`}
                  </AppText>
                </View>

                <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
                  {t('support.contact')}
                </AppText>
                <TextInput
                  value={contact}
                  onChangeText={setContact}
                  placeholder={t('support.contactPlaceholder')}
                  placeholderTextColor={home.textMuted}
                  selectionColor={colors.primary}
                  maxLength={120}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('support.contact')}
                  style={styles.input}
                />
              </Animated.View>

              {error ? (
                <View style={styles.error}>
                  <Ionicons name="alert-circle" size={18} color={home.dangerInk} />
                  <AppText variant="caption" color={home.dangerInk} style={styles.flex}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              <Button title={t('support.send')} icon="paper-plane" iconPosition="right" loading={sending} disabled={!valid} onPress={send} />
            </>
          )}

          {tickets.length ? (
            <Animated.View entering={enter.rise(180)} style={styles.section}>
              <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
                {t('support.history')}
              </AppText>
              {tickets.map((ticket) => (
                <View key={ticket.id} style={styles.ticket}>
                  <View style={styles.ticketHead}>
                    <AppText variant="captionStrong" color={home.text} style={styles.flex}>
                      {t(`support.cat.${ticket.category}` as TranslationKey)}
                    </AppText>
                    <View style={[styles.status, { backgroundColor: `${STATUS_TINT[ticket.status]}22` }]}>
                      <AppText variant="captionStrong" color={STATUS_TINT[ticket.status]} style={styles.statusText}>
                        {t(`support.status.${ticket.status}` as TranslationKey)}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="caption" color={home.textSecondary} numberOfLines={2}>
                    {ticket.message}
                  </AppText>
                </View>
              ))}
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    stretch: { alignSelf: 'stretch' },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: home.background },
    content: { gap: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    section: { gap: spacing.sm },
    label: { paddingHorizontal: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },

    heroOuter: { borderRadius: 28, backgroundColor: '#24508F', paddingBottom: 6 },
    hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: 28, overflow: 'hidden' },
    heroArt: { position: 'absolute', right: -18, bottom: -30, transform: [{ rotate: '-12deg' }] },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    heroText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '700' },

    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    category: { flexBasis: '47%', flexGrow: 1 },
    categoryFace: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    categorySelected: { borderColor: colors.primary, backgroundColor: home.selected },
    categoryIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

    input: {
      ...typography.body,
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.track,
      color: home.text,
    },
    textarea: { minHeight: 150 },
    counterRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs, marginBottom: spacing.sm },
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: home.dangerFill,
    },

    success: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xxl,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    successBadge: {
      width: 84,
      height: 84,
      marginBottom: spacing.sm,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#58CC02',
      borderBottomWidth: 5,
      borderBottomColor: '#3E9A00',
    },

    ticket: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    ticketHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    status: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
    statusText: { fontSize: 12 },
  });
