import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon, IconCircle } from '@/components/Icon';
import { TextField } from '@/components/Inputs';
import { Chip, ProgressBar, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useProgress } from '@/store/progress';
import type { LifeGoal } from '@/store/types';
import { useTheme } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatDate } from '@/utils/time';

export default function Goals() {
  const { t } = useT();
  const content = useContent();
  const goals = useProgress((s) => s.goals);
  const p = useProgress();
  const celebrate = useApp((s) => s.celebrate);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [category, setCategory] = useState('learning');
  const [steps, setSteps] = useState(['', '', '']);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = goals.find((g) => g.id === openId) ?? null;
  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);

  const create = () => {
    if (!title.trim()) return;
    p.addGoal({ title, why, category, steps });
    setTitle('');
    setWhy('');
    setSteps(['', '', '']);
    setCreating(false);
  };

  return (
    <Screen
      title={t('me.goals')}
      subtitle={t('goals.subtitle')}
      testID="screen-goals"
      footer={<Button label={t('goals.new')} icon="add" full onPress={() => setCreating(true)} testID="goal-new" />}
    >
      {goals.length === 0 ? (
        <EmptyState icon="flag-outline" title={t('goals.emptyTitle')} body={t('goals.emptyBody')} />
      ) : null}
      {active.length ? (
        <Section title={t('goals.active')}>
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onPress={() => setOpenId(g.id)} />
          ))}
        </Section>
      ) : null}
      {done.length ? (
        <Section title={t('goals.completed')}>
          {done.map((g) => (
            <GoalCard key={g.id} goal={g} onPress={() => setOpenId(g.id)} />
          ))}
        </Section>
      ) : null}

      <Sheet visible={creating} onClose={() => setCreating(false)} title={t('goals.new')}>
        <TextField label={t('goals.what')} hint={t('goals.whatHint')} value={title} onChangeText={setTitle} maxLength={80} testID="goal-title" />
        <TextField label={t('goals.why')} hint={t('goals.whyHint')} value={why} onChangeText={setWhy} maxLength={200} multiline />
        <Text variant="smallStrong">{t('goals.category')}</Text>
        <Row wrap>
          {content.goalCategories.map((c) => (
            <Chip key={c.id} label={c.label} icon={c.icon} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </Row>
        <Text variant="smallStrong">{t('goals.steps')}</Text>
        <Text variant="caption" color="textMuted">
          {t('goals.stepsHint')}
        </Text>
        {steps.map((s, i) => (
          <TextField key={i} label={t('goals.stepN', { n: i + 1 })} value={s} onChangeText={(v) => setSteps(steps.map((x, k) => (k === i ? v : x)))} maxLength={80} />
        ))}
        <Button label={t('goals.addStep')} variant="ghost" icon="add" onPress={() => setSteps([...steps, ''])} />
        <Button label={t('common.save')} full disabled={!title.trim()} onPress={create} testID="goal-save" />
      </Sheet>

      <GoalSheet
        goal={open}
        onClose={() => setOpenId(null)}
        onToggleStep={(stepId) => open && p.toggleStep(open.id, stepId)}
        onAddStep={(text) => open && p.addStep(open.id, text)}
        onCheckin={(note) => {
          if (!open) return;
          p.addGoalCheckin(open.id, note);
        }}
        onComplete={(value) => {
          if (!open) return;
          p.setGoalCompleted(open.id, value);
          if (value) {
            celebrate({ kind: 'message', title: t('goals.doneTitle'), body: t('goals.doneBody', { goal: open.title }) });
            checkBadges();
          }
        }}
        onDelete={async () => {
          if (!open) return;
          const ok = await confirm({ title: t('goals.deleteTitle'), message: t('goals.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
          if (ok) {
            p.removeGoal(open.id);
            setOpenId(null);
          }
        }}
      />
    </Screen>
  );
}

function GoalCard({ goal, onPress }: { goal: LifeGoal; onPress: () => void }) {
  const { t } = useT();
  const content = useContent();
  const doneSteps = goal.steps.filter((s) => s.done).length;
  const cat = content.goalCategories.find((c) => c.id === goal.category);
  return (
    <Card onPress={onPress}>
      <Row>
        <IconCircle name={goal.completedAt ? 'checkmark-done' : (cat?.icon ?? 'flag-outline')} tone={goal.completedAt ? 'success' : 'primary'} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{goal.title}</Text>
          {goal.why ? (
            <Text variant="small" color="textMuted" numberOfLines={2}>
              {goal.why}
            </Text>
          ) : null}
        </View>
      </Row>
      {goal.steps.length ? (
        <View style={{ marginTop: 12, gap: 6 }}>
          <ProgressBar value={doneSteps} max={goal.steps.length} label={t('goals.progress', { done: doneSteps, total: goal.steps.length })} />
          <Text variant="caption" color="textMuted">
            {t('goals.progress', { done: doneSteps, total: goal.steps.length })}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function GoalSheet({
  goal,
  onClose,
  onToggleStep,
  onAddStep,
  onCheckin,
  onComplete,
  onDelete,
}: {
  goal: LifeGoal | null;
  onClose: () => void;
  onToggleStep: (id: string) => void;
  onAddStep: (text: string) => void;
  onCheckin: (note: string) => void;
  onComplete: (value: boolean) => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const [newStep, setNewStep] = useState('');
  const [note, setNote] = useState('');
  return (
    <Sheet visible={!!goal} onClose={onClose} title={goal?.title}>
      {goal ? (
        <>
          {goal.why ? (
            <Card tone="primary">
              <Text variant="caption" color="onPrimarySoft">
                {t('goals.whyLabel')}
              </Text>
              <Text variant="body" color="onPrimarySoft">
                {goal.why}
              </Text>
            </Card>
          ) : null}
          {goal.steps.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onToggleStep(s.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              accessibilityLabel={s.text}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Icon name={s.done ? 'checkbox' : 'square-outline'} color={s.done ? colors.primary : colors.textMuted} />
              <Text variant="body" style={{ flex: 1, textDecorationLine: s.done ? 'line-through' : 'none' }}>
                {s.text}
              </Text>
            </Pressable>
          ))}
          <Row>
            <View style={{ flex: 1 }}>
              <TextField label={t('goals.addStep')} value={newStep} onChangeText={setNewStep} maxLength={80} />
            </View>
          </Row>
          <Button
            label={t('goals.addStep')}
            variant="secondary"
            small
            disabled={!newStep.trim()}
            onPress={() => {
              onAddStep(newStep);
              setNewStep('');
            }}
          />
          <Text variant="heading">{t('goals.reflect')}</Text>
          <TextField label={t('goals.reflectPrompt')} value={note} onChangeText={setNote} multiline maxLength={500} />
          <Button
            label={t('goals.saveReflection')}
            variant="soft"
            disabled={!note.trim()}
            onPress={() => {
              onCheckin(note);
              setNote('');
            }}
          />
          {goal.checkins
            .slice()
            .reverse()
            .slice(0, 5)
            .map((c) => (
              <Card key={c.at} tone="alt">
                <Text variant="caption" color="textMuted">
                  {formatDate(c.at)}
                </Text>
                <Text variant="small">{c.note}</Text>
              </Card>
            ))}
          <Button label={goal.completedAt ? t('goals.reopen') : t('goals.markDone')} icon={goal.completedAt ? 'refresh' : 'trophy-outline'} full onPress={() => onComplete(!goal.completedAt)} />
          <Button label={t('common.delete')} variant="danger" full onPress={onDelete} />
        </>
      ) : null}
    </Sheet>
  );
}
