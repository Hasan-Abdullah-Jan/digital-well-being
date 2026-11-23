import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CrewAvatar } from '@/components/CrewAvatar';
import { TextField } from '@/components/Inputs';
import { Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { checkBadges } from '@/features/badges';
import { decodeCrew } from '@/features/crew';
import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useCrew } from '@/store/crew';

/** Join a crew from a code, or merge an updated code into a crew you already have. */
export default function JoinCrew() {
  const { t } = useT();
  const crews = useCrew((s) => s.crews);
  const addCrew = useCrew((s) => s.addCrew);
  const updateCrew = useCrew((s) => s.updateCrew);
  const mergeLog = useCrew((s) => s.mergeLog);
  const showToast = useApp((s) => s.showToast);
  const [code, setCode] = useState('');
  const decoded = useMemo(() => (code.trim() ? decodeCrew(code) : null), [code]);
  const existing = decoded ? crews.find((c) => c.id === decoded.id) : undefined;

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (text) setCode(text);
  };

  const apply = () => {
    if (!decoded) return;
    if (existing) {
      // Add anyone or any habit new to this phone, then merge everyone's check-ins.
      const members = [...existing.members, ...decoded.members.filter((m) => !existing.members.some((x) => x.id === m.id))];
      const habits = [...existing.habits, ...decoded.habits.filter((h) => !existing.habits.some((x) => x.id === h.id))];
      updateCrew(existing.id, { members, habits });
      const added = mergeLog(existing.id, decoded.log);
      showToast(added > 0 ? t('crew.mergedCount', { count: added }) : t('crew.mergedNone'));
      router.replace({ pathname: '/crew/[id]', params: { id: existing.id } });
      return;
    }
    const crew = addCrew(decoded);
    checkBadges();
    showToast(t('crew.joined', { name: crew.name }));
    router.replace({ pathname: '/crew/[id]', params: { id: crew.id } });
  };

  return (
    <Screen
      title={t('crew.joinTitle')}
      subtitle={t('crew.joinSubtitle')}
      testID="screen-crew-join"
      footer={<Button label={existing ? t('crew.updateButton') : t('crew.joinButton')} icon={existing ? 'sync-outline' : 'enter-outline'} full disabled={!decoded} onPress={apply} testID="crew-join-apply" />}
    >
      <Section>
        <TextField label={t('crew.codeLabel')} value={code} onChangeText={setCode} multiline autoCapitalize="none" autoCorrect={false} placeholder="LUMI-CREW1:…" testID="crew-code" error={code.trim() && !decoded ? t('crew.codeInvalid') : undefined} />
        <Button label={t('crew.paste')} icon="clipboard-outline" variant="secondary" small onPress={paste} style={{ alignSelf: 'flex-start' }} />
      </Section>

      {decoded ? (
        <Card tone={existing ? 'primary' : 'success'}>
          <Text variant="caption" color={existing ? 'onPrimarySoft' : 'onSuccessSoft'}>
            {existing ? t('crew.previewUpdate') : t('crew.previewNew')}
          </Text>
          <Text variant="heading" style={{ marginTop: 4 }}>
            {decoded.name}
          </Text>
          <Text variant="small" color="textMuted">
            {t('crew.previewMeta', { days: decoded.days, habits: decoded.habits.length, members: decoded.members.length })}
          </Text>
          <Row gap={0} style={{ marginTop: 10 }}>
            {decoded.members.map((m, i) => (
              <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <CrewAvatar member={m} size={32} ring />
              </View>
            ))}
          </Row>
        </Card>
      ) : (
        <Card tone="alt">
          <Text variant="small">{t('crew.joinHow')}</Text>
        </Card>
      )}
    </Screen>
  );
}
