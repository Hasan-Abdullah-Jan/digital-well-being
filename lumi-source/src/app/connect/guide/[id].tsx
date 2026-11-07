import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { ProgressBar, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { useTheme } from '@/theme';

type GuideSection = { heading: string; body?: string; bullets?: string[] };

export default function Guide() {
  const { t } = useT();
  const content = useContent();
  const { colors, radius } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = content.guides.find((g) => g.id === id);
  const markRead = useProgress((s) => s.markGuideRead);
  const checklists = useProgress((s) => s.checklists);
  const toggle = useProgress((s) => s.toggleChecklist);
  const quizAnswers = useProgress((s) => s.quizAnswers);
  const answer = useProgress((s) => s.answerQuiz);

  useEffect(() => {
    if (!guide) return;
    markRead(guide.id);
    checkBadges();
  }, [guide, markRead]);

  if (!guide) {
    return (
      <Screen title={t('safety.guide')}>
        <EmptyState icon="book-outline" title={t('notFound.title')} body={t('notFound.body')} />
      </Screen>
    );
  }

  const checklist = 'checklist' in guide ? (guide.checklist as { id: string; text: string }[]) : [];
  const ticked = checklists[guide.id] ?? [];

  return (
    <Screen title={guide.title} testID={`screen-guide-${guide.id}`}>
      <Row style={{ marginBottom: 16 }}>
        <IconCircle name={guide.icon} size={52} />
        <Text variant="body" color="textMuted" style={{ flex: 1 }}>
          {guide.summary}
        </Text>
      </Row>

      {(guide.sections as GuideSection[]).map((s) => (
        <Section key={s.heading} title={s.heading}>
          {s.body ? <Text variant="body">{s.body}</Text> : null}
          {s.bullets?.map((b) => (
            <Row key={b} style={{ alignItems: 'flex-start' }}>
              <Icon name="ellipse" size={8} color={colors.primary} style={{ marginTop: 8 }} />
              <Text variant="body" style={{ flex: 1 }}>
                {b}
              </Text>
            </Row>
          ))}
        </Section>
      ))}

      {checklist.length > 0 ? (
        <Section title={t('safety.checklist')}>
          <ProgressBar value={ticked.length} max={checklist.length} label={t('safety.checklistProgress', { done: ticked.length, total: checklist.length })} />
          <Text variant="caption" color="textMuted">
            {t('safety.checklistProgress', { done: ticked.length, total: checklist.length })}
          </Text>
          {checklist.map((item) => {
            const on = ticked.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggle(guide.id, item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={item.text}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Icon name={on ? 'checkbox' : 'square-outline'} color={on ? colors.primary : colors.textMuted} />
                <Text variant="body" style={{ flex: 1 }}>
                  {item.text}
                </Text>
              </Pressable>
            );
          })}
        </Section>
      ) : null}

      {guide.id === 'consent' ? (
        <Section title={t('safety.quizTitle')}>
          <Text variant="small" color="textMuted">
            {t('safety.quizIntro')}
          </Text>
          {content.consentQuiz.map((q) => {
            const picked = quizAnswers[q.id];
            const correct = picked === q.answer;
            return (
              <Card key={q.id}>
                <Text variant="bodyStrong">{q.scenario}</Text>
                <Row wrap style={{ marginTop: 10 }}>
                  {(['ok', 'ask', 'notok'] as const).map((opt) => (
                    <Button key={opt} label={t(`safety.quiz.${opt}`)} small variant={picked === opt ? (correct ? 'soft' : 'danger') : 'secondary'} onPress={() => answer(q.id, opt)} />
                  ))}
                </Row>
                {picked ? (
                  <View style={{ marginTop: 10 }}>
                    <Text variant="smallStrong" color={correct ? 'success' : 'text'}>
                      {correct ? t('safety.quiz.right') : t('safety.quiz.think')}
                    </Text>
                    <Text variant="small" color="textMuted">
                      {q.explanation}
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </Section>
      ) : null}

      {guide.category === 'safety' ? (
        <Section title={t('safety.nextSteps')}>
          <Button label={t('tools.evidence')} icon="folder-open-outline" variant="secondary" full onPress={() => router.push('/connect/evidence')} />
          <Button label={t('help.anonNote')} icon="mail-unread-outline" variant="secondary" full onPress={() => router.push('/connect/note')} />
          <Button label={t('help.button')} icon="heart" variant="accent" full onPress={() => router.push('/help')} />
        </Section>
      ) : null}
      <Text variant="caption" color="textMuted">
        {t('safety.disclaimer')}
      </Text>
    </Screen>
  );
}
