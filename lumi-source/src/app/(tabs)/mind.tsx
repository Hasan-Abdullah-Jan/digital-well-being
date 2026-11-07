import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { ListRow, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { useWellbeing } from '@/store/wellbeing';
import { useTheme } from '@/theme';
import { dateKey, formatWeekdayShort, lastNDays } from '@/utils/time';

export default function Mind() {
  const { t } = useT();
  const content = useContent();
  const { colors, radius } = useTheme();
  const moods = useWellbeing((s) => s.moods);
  const days = lastNDays(7);
  const byDay = days.map((d) => {
    const list = moods.filter((m) => dateKey(m.at) === d && m.context === 'general');
    return list.length ? list[list.length - 1].score : null;
  });

  return (
    <Screen large title={t('mind.title')} subtitle={t('mind.subtitle')} testID="screen-mind">
      <Section title={t('mind.moodTitle')} action={<Button label={t('mind.history')} variant="ghost" small onPress={() => router.push('/mind/mood-history')} />}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={t('mind.weekStripLabel')}>
            {days.map((d, i) => {
              const score = byDay[i];
              return (
                <View key={d} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: '100%',
                      height: 34,
                      borderRadius: radius.sm,
                      backgroundColor: score ? colors.mood[score - 1] : colors.surfaceAlt,
                    }}
                  />
                  <Text variant="caption" color="textMuted">
                    {formatWeekdayShort(d)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Button label={t('mind.checkIn')} icon="add" full style={{ marginTop: 14 }} onPress={() => router.push('/mind/mood')} testID="mind-checkin" />
        </Card>
      </Section>

      <Section title={t('mind.calmNow')}>
        <Row style={{ alignItems: 'stretch' }}>
          <Card style={{ flex: 1 }} onPress={() => router.push('/mind/breathe')} testID="card-breathe">
            <IconCircle name="leaf-outline" tone="success" />
            <Text variant="bodyStrong" style={{ marginTop: 8 }}>
              {t('tools.breathe')}
            </Text>
            <Text variant="caption" color="textMuted">
              {t('mind.breatheSub')}
            </Text>
          </Card>
          <Card style={{ flex: 1 }} onPress={() => router.push('/mind/grounding')}>
            <IconCircle name="hand-right-outline" tone="success" />
            <Text variant="bodyStrong" style={{ marginTop: 8 }}>
              {t('tools.grounding')}
            </Text>
            <Text variant="caption" color="textMuted">
              {t('mind.groundingSub')}
            </Text>
          </Card>
        </Row>
        <ListRow icon="pulse-outline" title={t('tools.stress')} subtitle={t('mind.stressSub')} onPress={() => router.push('/mind/stress')} />
      </Section>

      <Section title={t('mind.journalTitle')}>
        <ListRow icon="heart-outline" title={t('journal.types.gratitude')} subtitle={t('mind.gratitudeSub')} onPress={() => router.push({ pathname: '/mind/journal-entry', params: { type: 'gratitude' } })} />
        <ListRow icon="trophy-outline" title={t('journal.types.win')} subtitle={t('mind.winsSub')} onPress={() => router.push({ pathname: '/mind/journal-entry', params: { type: 'win' } })} />
        <ListRow icon="book-outline" title={t('mind.allEntries')} subtitle={t('mind.allEntriesSub')} onPress={() => router.push('/mind/journal')} testID="row-journal" />
      </Section>

      <Section title={t('mind.realityTitle')}>
        <ListRow icon="albums-outline" title={t('tools.reality')} subtitle={t('mind.realitySub', { count: content.realityCards.length })} onPress={() => router.push('/mind/reality')} />
        <ListRow icon="phone-portrait-outline" title={t('tools.afterScroll')} subtitle={t('mind.afterScrollSub')} onPress={() => router.push('/mind/after-scroll')} />
        <ListRow icon="planet-outline" title={t('mind.escapismTitle')} subtitle={t('mind.escapismSub')} onPress={() => router.push('/connect/guide/escapism')} />
      </Section>

      <Section title={t('mind.sleepTitle')}>
        <ListRow icon="bed-outline" title={t('tools.sleep')} subtitle={t('mind.sleepSub')} onPress={() => router.push('/mind/sleep')} />
      </Section>

      <Card tone="alt">
        <Text variant="small" color="textMuted">
          {t('mind.privacyNote')}
        </Text>
      </Card>
    </Screen>
  );
}
