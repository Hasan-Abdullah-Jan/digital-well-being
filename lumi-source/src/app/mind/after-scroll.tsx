import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { TextField } from '@/components/Inputs';
import { Chip, ListRow, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { offerSupportIfNeeded } from '@/features/distress';
import { useContent, useT } from '@/i18n';
import { useHabits } from '@/store/habits';
import type { MoodScore } from '@/store/types';
import { useWellbeing } from '@/store/wellbeing';
import { pickDaily } from '@/utils/misc';
import { dateKey } from '@/utils/time';

export default function AfterScroll() {
  const { t } = useT();
  const content = useContent();
  const params = useLocalSearchParams<{ app?: string }>();
  const limits = useHabits((s) => s.limits);
  const addMood = useWellbeing((s) => s.addMood);
  const [app, setApp] = useState<string>(params.app ?? '');
  const [feeling, setFeeling] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const appChoices = Array.from(new Set([...limits.map((l) => l.label), ...(params.app ? [params.app] : [])])).slice(0, 8);

  const save = () => {
    const f = content.afterScrollFeelings.find((x) => x.id === feeling);
    if (!f) return;
    addMood({ score: f.score as MoodScore, emotions: [], context: 'after-scroll', feeling: f.id, app: app.trim() || undefined, note: note.trim() || undefined });
    offerSupportIfNeeded(note, 'after-scroll');
    checkBadges();
    setSaved(f.id);
  };

  if (saved) {
    const positive = saved === 'better' || saved === 'inspired';
    const neutral = saved === 'same';
    const card = pickDaily(content.realityCards, `${dateKey()}-${saved}`);
    const swap = pickDaily(content.swaps.filter((s) => s.minutes <= 10), `${dateKey()}-swap`);
    return (
      <Screen title={t('tools.afterScroll')} testID="screen-after-scroll">
        <View style={{ alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <IconCircle name={positive ? 'sunny-outline' : 'heart-outline'} tone={positive ? 'success' : 'accent'} size={64} />
          <Text variant="title" align="center">
            {positive ? t('afterScroll.positiveTitle') : neutral ? t('afterScroll.neutralTitle') : t('afterScroll.lowTitle')}
          </Text>
          <Text variant="body" color="textMuted" align="center">
            {positive ? t('afterScroll.positiveBody') : neutral ? t('afterScroll.neutralBody') : t('afterScroll.lowBody')}
          </Text>
        </View>
        {!positive && card ? (
          <Card tone="primary" style={{ marginBottom: 12 }}>
            <Text variant="bodyStrong" color="onPrimarySoft">
              {card.title}
            </Text>
            <Text variant="small" color="onPrimarySoft">
              {card.body}
            </Text>
          </Card>
        ) : null}
        {!positive && swap ? (
          <Card tone="success" style={{ marginBottom: 12 }}>
            <Text variant="smallStrong" color="onSuccessSoft">
              {t('afterScroll.tryInstead')}
            </Text>
            <Text variant="body" color="onSuccessSoft">
              {swap.text}
            </Text>
          </Card>
        ) : null}
        <Section title={t('afterScroll.next')}>
          {!positive ? <ListRow icon="filter-outline" title={t('afterScroll.cleanFeed')} subtitle={t('afterScroll.cleanFeedSub')} onPress={() => router.push('/connect/guide/feed-cleanup')} /> : null}
          {!positive ? <ListRow icon="albums-outline" title={t('tools.reality')} onPress={() => router.push('/mind/reality')} /> : null}
          <ListRow icon="hand-left-outline" title={t('tools.limits')} onPress={() => router.push('/habits/limits')} />
          <ListRow icon="analytics-outline" title={t('afterScroll.seePatterns')} onPress={() => router.push('/me/insights')} />
        </Section>
        <Button label={t('common.done')} full onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('tools.afterScroll')}
      subtitle={t('afterScroll.subtitle')}
      testID="screen-after-scroll"
      footer={<Button label={t('common.save')} full disabled={!feeling} onPress={save} testID="after-scroll-save" />}
    >
      <Section title={t('afterScroll.whichApp')}>
        {appChoices.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {appChoices.map((a) => (
              <Chip key={a} label={a} selected={app === a} onPress={() => setApp(app === a ? '' : a)} />
            ))}
          </View>
        ) : null}
        <TextField label={t('afterScroll.appName')} value={app} onChangeText={setApp} maxLength={40} />
      </Section>
      <Section title={t('afterScroll.howFeel')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {content.afterScrollFeelings.map((f) => (
            <Chip key={f.id} label={f.label} icon={f.icon} selected={feeling === f.id} onPress={() => setFeeling(f.id)} testID={`feeling-${f.id}`} />
          ))}
        </View>
      </Section>
      <TextField label={t('afterScroll.note')} hint={t('afterScroll.noteHint')} value={note} onChangeText={setNote} multiline maxLength={500} />
    </Screen>
  );
}
