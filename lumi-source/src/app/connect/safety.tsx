import { router } from 'expo-router';

import { Card } from '@/components/Card';
import { ListRow, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useContent, useT } from '@/i18n';
import { useProgress } from '@/store/progress';

const ORDER = ['safety', 'privacy', 'habits', 'wellbeing'] as const;

export default function SafetyCentre() {
  const { t } = useT();
  const content = useContent();
  const read = useProgress((s) => s.guidesRead);

  return (
    <Screen title={t('tools.safety')} subtitle={t('safety.subtitle')} testID="screen-safety">
      <Card tone="accent" style={{ marginBottom: 20 }} onPress={() => router.push('/connect/guide/report-block')}>
        <Text variant="bodyStrong" color="onAccentSoft">
          {t('safety.urgentTitle')}
        </Text>
        <Text variant="small" color="onAccentSoft" style={{ marginTop: 4 }}>
          {t('safety.urgentBody')}
        </Text>
      </Card>
      <Section title={t('safety.tools')}>
        <ListRow icon="folder-open-outline" title={t('tools.evidence')} subtitle={t('connect.evidenceSub')} onPress={() => router.push('/connect/evidence')} />
        <ListRow icon="mail-unread-outline" title={t('connect.anonNote')} subtitle={t('connect.anonNoteSub')} onPress={() => router.push('/connect/note')} />
      </Section>
      {ORDER.map((cat) => (
        <Section key={cat} title={t(`safety.categories.${cat}`)}>
          {content.guides
            .filter((g) => g.category === cat)
            .map((g) => (
              <ListRow
                key={g.id}
                icon={g.icon}
                tone={read[g.id] ? 'success' : 'primary'}
                title={g.title}
                subtitle={`${g.summary} · ${t('safety.minutes', { count: g.minutes })}${read[g.id] ? ` · ${t('safety.read')}` : ''}`}
                onPress={() => router.push(`/connect/guide/${g.id}`)}
                testID={`guide-${g.id}`}
              />
            ))}
        </Section>
      ))}
      <Text variant="caption" color="textMuted">
        {t('safety.disclaimer')}
      </Text>
    </Screen>
  );
}
