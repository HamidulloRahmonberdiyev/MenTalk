import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT, type TranslationKey } from '@/i18n';
import type { ApiNotebookMistake } from '@/services/api/endpoints';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

import { categoryOf } from './categories';
import { changesOf, sharedStart, type Change } from './diff';

const ICONS: Record<Change['kind'], IconName> = {
  form: 'sync',
  replace: 'swap-horizontal',
  missing: 'add-circle',
  extra: 'remove-circle',
  moved: 'move',
  order: 'shuffle',
};

const CAPTIONS: Record<Exclude<Change['kind'], 'order'>, TranslationKey> = {
  form: 'mistakes.change.form',
  replace: 'mistakes.change.replace',
  missing: 'mistakes.change.missing',
  extra: 'mistakes.change.extra',
  moved: 'mistakes.change.moved',
};

/**
 * Why a sentence was corrected, built without AI: every edit the correction made (from the two
 * sentences), the tutor's note when the chat left one, and the rule behind this kind of mistake.
 *
 * - `full`: both, under headings; for the lesson that introduces a mistake.
 * - `brief`: the edits and one line of why (the note, else the rule); for feedback after an answer.
 * - `why`: that line alone; for the notebook, where both sentences are already marked up.
 */
export function MistakeExplanation({ mistake, mode }: { mistake: ApiNotebookMistake; mode: 'full' | 'brief' | 'why' }) {
  const t = useT();
  const home = usePalette();
  const language = useSettingsStore((state) => state.language);
  const changes = useMemo(() => changesOf(mistake.said, mistake.correct), [mistake.said, mistake.correct]);
  const rule = categoryOf(mistake.category).rule;
  const note = mistake.note?.trim() || null;
  // The note is in the language the app showed when the chat took place; after a switch, the rule
  // (always in the current language) is the better one-line answer.
  const noteReadable = note !== null && (mistake.note_language === null || mistake.note_language === language);

  const edits = changes.length ? (
    <View style={styles.changes}>
      {changes.map((change, index) => (
        <ChangeRow key={index} change={change} />
      ))}
    </View>
  ) : null;

  if (mode !== 'full') {
    const why = (noteReadable ? note : null) ?? (rule ? t(rule) : null) ?? note;
    if (mode === 'why' && !why) return null;
    return (
      <View style={styles.brief}>
        {mode === 'brief' ? edits : null}
        {why ? (
          <View style={styles.why}>
            <Ionicons name="bulb" size={15} color={colors.warning} style={styles.whyIcon} />
            <AppText variant="caption" color={home.textSecondary} style={styles.flex}>
              {why}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.full}>
      {edits ? <Section title={t('mistakes.whatChanged')}>{edits}</Section> : null}
      {note || rule ? (
        <Section title={t('mistakes.why')}>
          {note ? <Reason icon="school" label={t('mistakes.tutorNote')} text={note} /> : null}
          {rule ? <Reason icon="book" label={t('mistakes.rule')} text={t(rule)} /> : null}
        </Section>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const home = usePalette();
  return (
    <View style={styles.section}>
      <AppText variant="captionStrong" color={home.textMuted} style={styles.heading}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Reason({ icon, label, text }: { icon: IconName; label: string; text: string }) {
  const home = usePalette();
  return (
    <View style={[styles.reason, { backgroundColor: home.track }]}>
      <Ionicons name={icon} size={18} color={colors.primary} style={styles.whyIcon} />
      <View style={styles.flex}>
        <AppText variant="captionStrong" color={home.textMuted}>
          {label}
        </AppText>
        <AppText variant="body" color={home.text}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

/** One edit: the word struck as said, the fix in green, and what kind of edit it is. */
function ChangeRow({ change }: { change: Change }) {
  const t = useT();
  const home = usePalette();
  const marks = markStyles(home);

  return (
    <View style={styles.change}>
      <Ionicons name={ICONS[change.kind]} size={18} color={home.textMuted} style={styles.whyIcon} />
      <View style={styles.flex}>
        {change.kind === 'order' ? (
          <AppText variant="bodyStrong" color={home.text}>
            {t('mistakes.change.order')}
          </AppText>
        ) : (
          <>
            <AppText variant="bodyStrong" color={home.text}>
              <Edit change={change} marks={marks} />
            </AppText>
            <AppText variant="caption" color={home.textMuted}>
              {t(CAPTIONS[change.kind])}
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

function Edit({ change, marks }: { change: Exclude<Change, { kind: 'order' }>; marks: ReturnType<typeof markStyles> }) {
  switch (change.kind) {
    case 'form': {
      // Only the part that changed is marked: "молок·о → молок·а" shows the ending at a glance.
      const shared = sharedStart(change.from, change.to);
      return (
        <>
          {change.from.slice(0, shared)}
          <AppText variant="bodyStrong" style={marks.struck}>
            {change.from.slice(shared)}
          </AppText>
          {'  →  '}
          {change.to.slice(0, shared)}
          <AppText variant="bodyStrong" style={marks.fixed}>
            {change.to.slice(shared)}
          </AppText>
        </>
      );
    }
    case 'replace':
      return (
        <>
          <AppText variant="bodyStrong" style={marks.struck}>
            {change.from}
          </AppText>
          {'  →  '}
          <AppText variant="bodyStrong" style={marks.fixed}>
            {change.to}
          </AppText>
        </>
      );
    case 'missing':
      return (
        <AppText variant="bodyStrong" style={marks.fixed}>
          + {change.to}
        </AppText>
      );
    case 'extra':
      return (
        <AppText variant="bodyStrong" style={marks.struck}>
          {change.from}
        </AppText>
      );
    case 'moved':
      return <>{change.word}</>;
  }
}

const markStyles = (home: Palette): { struck: TextStyle; fixed: TextStyle } => ({
  struck: { color: home.dangerInk, textDecorationLine: 'line-through' },
  fixed: { color: home.successInk, fontWeight: '800' },
});

const styles = StyleSheet.create({
  full: { gap: spacing.xl },
  brief: { gap: spacing.sm },
  section: { gap: spacing.sm },
  heading: { textTransform: 'uppercase', letterSpacing: 0.8 },
  changes: { gap: spacing.sm },
  change: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  whyIcon: { marginTop: 2 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, borderRadius: radii.md },
  flex: { flex: 1 },
});
