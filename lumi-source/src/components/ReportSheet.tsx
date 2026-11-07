import { useContent, useT } from '@/i18n';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

export function ReportSheet({ visible, onClose, onReport }: { visible: boolean; onClose: () => void; onReport: (reason: string) => void }) {
  const { t } = useT();
  const content = useContent();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('peer.reportTitle')}>
      <Text variant="small" color="textMuted">
        {t('peer.reportBody')}
      </Text>
      {content.reportReasons.map((r) => (
        <Button key={r.id} label={r.label} variant="secondary" full onPress={() => onReport(r.id)} />
      ))}
    </Sheet>
  );
}
