import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/Inputs';
import { Chip, Section } from '@/components/Layout';
import { MoodPicker } from '@/components/MoodPicker';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { offerSupportIfNeeded } from '@/features/distress';
import { useContent, useT } from '@/i18n';
import { shouldOfferLowMoodSupport } from '@/safety/detect';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import type { MoodScore } from '@/store/types';
import { useWellbeing } from '@/store/wellbeing';

export default function MoodCheckin() {
  const { t } = useT();
  const content = useContent();
  const params = useLocalSearchParams<{ score?: string }>();
  const initial = Number(params.score);
  const [score, setScore] = useState<MoodScore | null>(initial >= 1 && initial <= 5 ? (initial as MoodScore) : null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const addMood = useWellbeing((s) => s.addMood);
  const toast = useApp((s) => s.showToast);

  const save = () => {
    if (!score) return;
    addMood({ score, emotions, note: note.trim() || undefined, context: 'general' });
    const supported = offerSupportIfNeeded(note, 'mood');
    if (!supported) {
      const settings = useSettings.getState();
      if (shouldOfferLowMoodSupport(useWellbeing.getState().moods, settings.lowMoodSupportShownAt)) {
        settings.update({ lowMoodSupportShownAt: Date.now() });
        useApp.getState().showSupport('low-mood');
      } else {
        toast(score <= 2 ? t('mood.savedLow') : t('mood.saved'));
      }
    }
    checkBadges();
    router.back();
  };

  return (
    <Screen
      title={t('mood.title')}
      testID="screen-mood"
      footer={<Button label={t('mood.save')} full disabled={!score} onPress={save} testID="mood-save" />}
    >
      <Text variant="title" style={{ marginBottom: 16 }}>
        {t('mood.question')}
      </Text>
      <MoodPicker value={score} onChange={setScore} />
      <Section title={t('mood.emotions')} style={{ marginTop: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {content.emotions.map((e) => (
            <Chip
              key={e.id}
              label={e.label}
              selected={emotions.includes(e.id)}
              onPress={() => setEmotions(emotions.includes(e.id) ? emotions.filter((x) => x !== e.id) : [...emotions, e.id])}
            />
          ))}
        </View>
      </Section>
      <TextField label={t('mood.note')} hint={t('mood.noteHint')} value={note} onChangeText={setNote} multiline maxLength={1000} testID="mood-note" />
    </Screen>
  );
}
