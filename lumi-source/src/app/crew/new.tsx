import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CrewAvatar } from '@/components/CrewAvatar';
import { Icon } from '@/components/Icon';
import { Segmented, TextField } from '@/components/Inputs';
import { Chip, Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { CREW_COLORS, MAX_HABITS, MAX_MEMBERS } from '@/features/crew';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useCrew } from '@/store/crew';
import { useSettings } from '@/store/settings';
import type { Crew, CrewHabit, CrewMember } from '@/store/types';
import { useTheme } from '@/theme';
import { makeId, pickDaily } from '@/utils/misc';
import { addDaysToKey, dateKey } from '@/utils/time';

const LENGTHS = [3, 7, 14, 21, 30];

export default function NewCrew() {
  const { t } = useT();
  const content = useContent();
  const { colors, radius, neu } = useTheme();
  const nickname = useSettings((s) => s.nickname);
  const addCrew = useCrew((s) => s.addCrew);
  const showToast = useApp((s) => s.showToast);

  const [name, setName] = useState(() => pickDaily(content.crewNames, String(Date.now())) ?? '');
  const [members, setMembers] = useState<CrewMember[]>(() => [{ id: makeId('m'), name: nickname.trim() || t('crew.me'), color: 0, me: true }]);
  const [memberName, setMemberName] = useState('');
  const [habits, setHabits] = useState<CrewHabit[]>(() => content.crewHabits.slice(0, 3).map((h) => ({ ...h })));
  const [customHabit, setCustomHabit] = useState('');
  const [days, setDays] = useState(7);
  const [startTomorrow, setStartTomorrow] = useState<'today' | 'tomorrow'>('today');
  const [mode, setMode] = useState<Crew['mode']>('versus');
  const [reward, setReward] = useState(content.crewRewards[0] ?? '');

  const selectedIds = useMemo(() => new Set(habits.map((h) => h.id)), [habits]);
  const canCreate = name.trim().length > 0 && members.length >= 1 && habits.length >= 1;

  const addMember = () => {
    const n = memberName.trim();
    if (!n || members.length >= MAX_MEMBERS) return;
    const used = new Set(members.map((m) => m.color));
    const color = CREW_COLORS.findIndex((_, i) => !used.has(i));
    setMembers([...members, { id: makeId('m'), name: n.slice(0, 24), color: color < 0 ? members.length : color }]);
    setMemberName('');
  };

  const toggleHabit = (h: CrewHabit) => {
    if (selectedIds.has(h.id)) setHabits(habits.filter((x) => x.id !== h.id));
    else if (habits.length < MAX_HABITS) setHabits([...habits, { ...h }]);
    else showToast(t('crew.maxHabits', { count: MAX_HABITS }));
  };

  const addCustom = () => {
    const title = customHabit.trim();
    if (!title) return;
    if (habits.length >= MAX_HABITS) {
      showToast(t('crew.maxHabits', { count: MAX_HABITS }));
      return;
    }
    setHabits([...habits, { id: makeId('h'), title: title.slice(0, 60), icon: 'star-outline', points: 10 }]);
    setCustomHabit('');
  };

  const create = () => {
    if (!canCreate) return;
    const crew = addCrew({
      name: name.trim(),
      startDate: startTomorrow === 'tomorrow' ? addDaysToKey(dateKey(), 1) : dateKey(),
      days,
      reward: reward.trim(),
      mode,
      members,
      habits,
    });
    checkBadges();
    router.replace({ pathname: '/crew/[id]', params: { id: crew.id, fresh: '1' } });
  };

  return (
    <Screen
      title={t('crew.newTitle')}
      subtitle={t('crew.newSubtitle')}
      testID="screen-crew-new"
      footer={<Button label={t('crew.create')} icon="rocket-outline" full disabled={!canCreate} onPress={create} testID="crew-create" />}
    >
      <Section title={t('crew.nameTitle')}>
        <TextField label={t('crew.nameLabel')} value={name} onChangeText={setName} maxLength={40} testID="crew-name" />
      </Section>

      <Section title={t('crew.membersTitle', { count: members.length, max: MAX_MEMBERS })}>
        <View style={{ gap: 8 }}>
          {members.map((m) => (
            <Row key={m.id} style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, boxShadow: neu.raisedSm }}>
              <CrewAvatar member={m} size={36} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {m.name}
                {m.me ? <Text variant="small" color="textMuted">{`  ${t('crew.youTag')}`}</Text> : null}
              </Text>
              {!m.me ? (
                <Pressable onPress={() => setMembers(members.filter((x) => x.id !== m.id))} accessibilityRole="button" accessibilityLabel={t('crew.removeMember', { name: m.name })} hitSlop={10}>
                  <Icon name="close-circle-outline" color={colors.textMuted} />
                </Pressable>
              ) : null}
            </Row>
          ))}
        </View>
        {members.length < MAX_MEMBERS ? (
          <Row style={{ alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('crew.addMember')} value={memberName} onChangeText={setMemberName} maxLength={24} placeholder={t('crew.memberPlaceholder')} onSubmitEditing={addMember} returnKeyType="done" testID="crew-member-name" />
            </View>
            <Button label={t('common.add')} icon="person-add-outline" small onPress={addMember} disabled={!memberName.trim()} testID="crew-add-member" />
          </Row>
        ) : null}
        <Text variant="caption" color="textMuted">
          {t('crew.membersHint')}
        </Text>
      </Section>

      <Section title={t('crew.habitsTitle', { count: habits.length, max: MAX_HABITS })}>
        <Row wrap gap={8}>
          {content.crewHabits.map((h) => (
            <Chip key={h.id} label={`${h.title} · ${h.points}`} icon={h.icon} selected={selectedIds.has(h.id)} onPress={() => toggleHabit(h)} />
          ))}
          {habits
            .filter((h) => !content.crewHabits.some((c) => c.id === h.id))
            .map((h) => (
              <Chip key={h.id} label={`${h.title} · ${h.points}`} icon="star-outline" selected onPress={() => toggleHabit(h)} />
            ))}
        </Row>
        <Row style={{ alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <TextField label={t('crew.customHabit')} value={customHabit} onChangeText={setCustomHabit} maxLength={60} placeholder={t('crew.customHabitPlaceholder')} onSubmitEditing={addCustom} returnKeyType="done" />
          </View>
          <Button label={t('common.add')} icon="add" small onPress={addCustom} disabled={!customHabit.trim()} />
        </Row>
        <Text variant="caption" color="textMuted">
          {t('crew.pointsHint')}
        </Text>
      </Section>

      <Section title={t('crew.lengthTitle')}>
        <Row wrap gap={8}>
          {LENGTHS.map((d) => (
            <Chip key={d} label={t('crew.days', { count: d })} selected={days === d} onPress={() => setDays(d)} />
          ))}
        </Row>
        <Segmented
          label={t('crew.startLabel')}
          value={startTomorrow}
          onChange={setStartTomorrow}
          options={[
            { value: 'today', label: t('crew.startToday') },
            { value: 'tomorrow', label: t('crew.startTomorrow') },
          ]}
        />
      </Section>

      <Section title={t('crew.modeTitle')}>
        <Segmented
          label={t('crew.modeTitle')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'versus', label: t('crew.modeVersus') },
            { value: 'team', label: t('crew.modeTeam') },
          ]}
        />
        <Card tone="alt">
          <Text variant="small">{mode === 'team' ? t('crew.modeTeamBody') : t('crew.modeVersusBody')}</Text>
        </Card>
      </Section>

      <Section title={t('crew.rewardTitle')}>
        <Row wrap gap={8}>
          {content.crewRewards.map((r) => (
            <Chip key={r} label={r} selected={reward === r} onPress={() => setReward(r)} />
          ))}
        </Row>
        <TextField label={t('crew.rewardLabel')} value={reward} onChangeText={setReward} maxLength={80} />
      </Section>
    </Screen>
  );
}
