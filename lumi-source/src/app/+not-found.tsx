import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/States';
import { useT } from '@/i18n';

export default function NotFound() {
  const { t } = useT();
  return (
    <Screen title={t('notFound.title')}>
      <EmptyState icon="compass-outline" title={t('notFound.title')} body={t('notFound.body')} />
      <Button label={t('notFound.home')} full onPress={() => router.replace('/')} />
    </Screen>
  );
}
