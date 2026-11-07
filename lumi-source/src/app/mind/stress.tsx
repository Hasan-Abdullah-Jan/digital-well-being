import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { TextField } from '@/components/Inputs';
import { ListRow, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { offerSupportIfNeeded } from '@/features/distress';
import { formatCountdown, useNow } from '@/features/useNow';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useWellbeing } from '@/store/wellbeing';

export default function Stress() {
  const { t } = useT();
  const content = useContent();
  const journal = useWellbeing((s) => s.journal);
  const addJournal = useWellbeing((s) => s.addJournal);
  const logExercise = useWellbeing((s) => s.logExercise);
  const toast = useApp((s) => s.showToast);
  const celebrate = useApp((s) => s.celebrate);

  // Worry jar
  const [worry, setWorry] = useState('');
  const [control, setControl] = useState('');
  const openWorries = journal.filter((j) => j.type === 'worry' && !j.closed);
  const closedCount = journal.filter((j) => j.type === 'worry' && j.closed).length;

  // 5-minute start
  const [task, setTask] = useState('');
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const now = useNow(1000, endsAt !== null);
  const fired = useRef(false);
  const remaining = endsAt ? endsAt - now : 0;

  useEffect(() => {
    if (!endsAt || remaining > 0 || fired.current) return;
    fired.current = true;
    setEndsAt(null);
    logExercise({ kind: 'five-minute', detail: task.trim() || undefined, seconds: 300 });
    celebrate({ kind: 'message', title: t('stress.fiveDoneTitle'), body: t('stress.fiveDoneBody') });
    checkBadges();
  }, [endsAt, remaining, logExercise, celebrate, t, task]);

  // Muscle relaxation
  const [relaxStep, setRelaxStep] = useState<number | null>(null);

  return (
    <Screen title={t('tools.stress')} subtitle={t('stress.subtitle')} testID="screen-stress">
      <Section title={t('stress.worryJar')}>
        <Card>
          <Text variant="small" color="textMuted" style={{ marginBottom: 12 }}>
            {t('stress.worryBody')}
          </Text>
          <View style={{ gap: 12 }}>
            <TextField label={content.journalPrompts.worry[0]} value={worry} onChangeText={setWorry} multiline maxLength={600} />
            <TextField label={content.journalPrompts.worry[1]} value={control} onChangeText={setControl} maxLength={300} />
            <Button
              label={t('stress.closeLid')}
              icon="archive-outline"
              disabled={!worry.trim()}
              onPress={() => {
                const text = control.trim() ? `${worry.trim()}\n\n${t('stress.controlLabel')} ${control.trim()}` : worry.trim();
                addJournal({ type: 'worry', text, closed: true });
                logExercise({ kind: 'worry-jar' });
                setWorry('');
                setControl('');
                if (!offerSupportIfNeeded(text, 'worry')) toast(t('stress.lidClosed'));
                checkBadges();
              }}
            />
          </View>
          <Text variant="caption" color="textMuted" style={{ marginTop: 10 }}>
            {t('stress.jarCount', { count: closedCount + openWorries.length })}
          </Text>
        </Card>
      </Section>

      <Section title={t('stress.fiveTitle')}>
        <Card tone={endsAt ? 'primary' : 'default'}>
          {endsAt ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text variant="display" style={{ fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
                {formatCountdown(remaining)}
              </Text>
              <Text variant="small" color="onPrimarySoft" align="center">
                {task.trim() ? t('stress.fiveWorking', { task: task.trim() }) : t('stress.fiveJustStart')}
              </Text>
              <Button label={t('common.stop')} variant="secondary" small onPress={() => setEndsAt(null)} />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text variant="small" color="textMuted">
                {t('stress.fiveBody')}
              </Text>
              <TextField label={t('stress.fiveTask')} value={task} onChangeText={setTask} maxLength={60} placeholder={t('stress.fivePlaceholder')} />
              <Button
                label={t('stress.fiveStart')}
                icon="play"
                onPress={() => {
                  fired.current = false;
                  setEndsAt(Date.now() + 5 * 60_000);
                }}
                testID="five-start"
              />
            </View>
          )}
        </Card>
      </Section>

      <Section title={t('stress.relaxTitle')}>
        <ListRow icon="body-outline" title={t('stress.relaxStart')} subtitle={t('stress.relaxSub')} onPress={() => setRelaxStep(0)} />
        <ListRow icon="leaf-outline" title={t('tools.breathe')} onPress={() => router.push('/mind/breathe')} />
        <ListRow icon="hand-right-outline" title={t('tools.grounding')} onPress={() => router.push('/mind/grounding')} />
      </Section>

      <Section title={t('stress.learnTitle')}>
        <ListRow icon="pulse-outline" title={t('stress.learnStress')} onPress={() => router.push('/connect/guide/stress-basics')} />
        <ListRow icon="timer-outline" title={t('stress.learnProcrastination')} onPress={() => router.push('/connect/guide/procrastination')} />
      </Section>

      <Sheet visible={relaxStep !== null} onClose={() => setRelaxStep(null)} title={t('stress.relaxTitle')}>
        {relaxStep !== null ? (
          <>
            <Row>
              <IconCircle name="body-outline" tone="success" />
              <Text variant="caption" color="textMuted">
                {t('stress.relaxStep', { step: relaxStep + 1, total: content.muscleRelax.length })}
              </Text>
            </Row>
            <Text variant="title" accessibilityLiveRegion="polite">
              {content.muscleRelax[relaxStep]}
            </Text>
            <Button
              label={relaxStep + 1 < content.muscleRelax.length ? t('common.next') : t('common.done')}
              full
              onPress={() => {
                if (relaxStep + 1 < content.muscleRelax.length) setRelaxStep(relaxStep + 1);
                else {
                  setRelaxStep(null);
                  logExercise({ kind: 'body-scan' });
                  toast(t('stress.relaxDone'));
                  checkBadges();
                }
              }}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
