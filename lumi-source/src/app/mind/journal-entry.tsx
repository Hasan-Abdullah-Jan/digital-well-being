import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Segmented, TextField } from '@/components/Inputs';
import { Chip, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { offerSupportIfNeeded } from '@/features/distress';
import { useContent, useT } from '@/i18n';
import { useApp } from '@/store/app';
import type { JournalType } from '@/store/types';
import { useWellbeing } from '@/store/wellbeing';
import { confirm } from '@/utils/confirm';

const TYPES: JournalType[] = ['gratitude', 'win', 'reflection'];

export default function JournalEntryScreen() {
  const { t } = useT();
  const content = useContent();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const existing = useWellbeing((s) => s.journal.find((j) => j.id === params.id));
  const add = useWellbeing((s) => s.addJournal);
  const update = useWellbeing((s) => s.updateJournal);
  const remove = useWellbeing((s) => s.deleteJournal);
  const toast = useApp((s) => s.showToast);
  const initialType = (existing?.type ?? (TYPES.includes(params.type as JournalType) ? params.type : 'gratitude')) as JournalType;
  const [type, setType] = useState<JournalType>(initialType);
  const [prompt, setPrompt] = useState<string | undefined>(existing?.prompt);
  const [text, setText] = useState(existing?.text ?? '');
  const prompts = content.journalPrompts[type === 'worry' ? 'worry' : type];

  const save = () => {
    const clean = text.trim();
    if (!clean) return;
    if (existing) update(existing.id, { type, prompt, text: clean });
    else add({ type, prompt, text: clean });
    if (!offerSupportIfNeeded(clean, 'journal')) toast(type === 'win' ? t('journal.savedWin') : t('journal.saved'));
    checkBadges();
    router.back();
  };

  return (
    <Screen
      title={existing ? t('journal.edit') : t('journal.new')}
      testID="screen-journal-entry"
      footer={
        <>
          <Button label={t('common.save')} full disabled={!text.trim()} onPress={save} testID="journal-save" />
          {existing ? (
            <Button
              label={t('common.delete')}
              variant="danger"
              full
              onPress={async () => {
                const ok = await confirm({ title: t('journal.deleteTitle'), message: t('journal.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
                if (ok) {
                  remove(existing.id);
                  router.back();
                }
              }}
            />
          ) : null}
        </>
      }
    >
      {type !== 'worry' ? (
        <Segmented
          label={t('journal.type')}
          value={type}
          onChange={(v) => {
            setType(v);
            setPrompt(undefined);
          }}
          options={TYPES.map((v) => ({ value: v, label: t(`journal.short.${v}`) }))}
        />
      ) : null}
      <Section title={t('journal.prompts')} style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {prompts.map((p) => (
            <Chip key={p} label={p} selected={prompt === p} onPress={() => setPrompt(prompt === p ? undefined : p)} />
          ))}
        </View>
      </Section>
      {prompt ? (
        <Text variant="heading" style={{ marginBottom: 8 }}>
          {prompt}
        </Text>
      ) : null}
      <TextField label={t('journal.yourWords')} value={text} onChangeText={setText} multiline maxLength={3000} autoFocus={!existing} testID="journal-text" />
    </Screen>
  );
}
