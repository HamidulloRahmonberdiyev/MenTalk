import { router } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { refreshFromServer, syncPath } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';

import { openConversation } from '../scenarios/navigation';
import { FinishCup } from './FinishCup';
import { FINISH_ROW, nodeY, ROW } from './layout';
import type { PathStage } from './path';
import { PathHero } from './PathHero';
import { PathRoad } from './PathRoad';
import { StageNode } from './StageNode';
import { StageSheet } from './StageSheet';
import { usePath } from './usePath';

const refreshAll = async () => {
  await refreshFromServer();
  await syncPath();
};

/**
 * Topics as a road: stage after stage, each opening once the one before it is passed, ending
 * at a cup. Tapping a stage shows its details and the way in.
 */
export function PathScreen() {
  const t = useT();
  const { width, height: screenHeight } = useWindowDimensions();
  const language = useSettingsStore((state) => state.studyLanguage);
  const stages = usePath();
  const { refreshControl, version } = useRefreshControl(refreshAll);

  const [selected, setSelected] = useState<PathStage | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingStart = useRef<PathStage | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const heroBottom = useRef(0);
  const scrolled = useRef(false);

  useEffect(() => {
    void syncPath(language);
  }, [language]);

  const passed = stages.filter((stage) => stage.status === 'passed').length;
  const stars = stages.reduce((sum, stage) => sum + stage.stars, 0);
  const openIndex = stages.findIndex((stage) => stage.status === 'open');
  const lastY = nodeY(stages.length - 1);
  const finish = { x: width / 2, y: lastY + ROW };
  const roadHeight = lastY + FINISH_ROW + spacing.xxxl;

  /** Brings the open stage into view once the layout is known, so a returning learner starts where they left off. */
  const scrollToOpen = useCallback(() => {
    if (scrolled.current || openIndex <= 1) return;
    scrolled.current = true;
    const y = heroBottom.current + nodeY(openIndex) - screenHeight * 0.4;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(y, 0), animated: true }));
  }, [openIndex, screenHeight]);

  const openStage = useCallback((stage: PathStage) => {
    setSelected(stage);
    setSheetOpen(true);
  }, []);

  const startStage = useCallback((stage: PathStage) => {
    pendingStart.current = stage;
    setSheetOpen(false);
  }, []);

  const handleClosed = useCallback(() => {
    const stage = pendingStart.current;
    pendingStart.current = null;
    setSelected(null);
    if (stage) openConversation(stage.scenario.id);
  }, []);

  const previous = selected && selected.number > 1 ? stages[selected.number - 2] : null;

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('home.menu.topics')} onBack={() => router.back()} style={styles.header} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <View
            style={styles.heroBox}
            onLayout={(event) => {
              heroBottom.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height;
            }}
          >
            <PathHero passed={passed} total={stages.length} stars={stars} />
          </View>

          <View style={{ height: roadHeight }} onLayout={scrollToOpen}>
            <PathRoad stages={stages} width={width} height={roadHeight} finish={finish} />
            {stages.map((stage, index) => (
              <StageNode key={stage.scenario.id} stage={stage} index={index} width={width} onPress={openStage} />
            ))}
            <FinishCup x={finish.x} y={finish.y} done={passed === stages.length} delay={80 + stages.length * 70} />
          </View>
        </Fragment>
      </ScrollView>

      <StageSheet
        stage={selected}
        previous={previous}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onClosed={handleClosed}
        onStart={startStage}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  heroBox: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
