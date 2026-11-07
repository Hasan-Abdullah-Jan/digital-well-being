/**
 * Shown when distress language appears or several low moods are logged.
 * Kind, calm, never alarming. It offers real people first, never promises secrecy,
 * and never gives clinical advice.
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { directoryUrl, helplineOptions, messageTrustedPerson, openLink } from '@/features/help';
import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';

import { Button } from './Button';
import { IconCircle } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export function SupportSheet() {
  const { t } = useT();
  const support = useApp((s) => s.support);
  const hide = useApp((s) => s.hideSupport);
  const contact = useSettings((s) => s.trustedContact);
  const options = helplineOptions();

  const go = (path: string) => {
    hide();
    router.push(path);
  };

  return (
    <Sheet visible={support.visible} onClose={hide} testID="support-sheet">
      <View style={{ alignItems: 'center', gap: 10 }}>
        <IconCircle name="heart" tone="accent" size={64} />
        <Text variant="title" align="center">
          {t('support.title')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {t('support.body')}
        </Text>
      </View>
      {options.slice(0, 2).map((o) => (
        <Button key={o.id} label={o.label} icon={o.icon} variant="accent" full onPress={() => openLink(o.href)} />
      ))}
      {options.length === 0 ? (
        <Button label={t('support.findHelpline')} icon="globe-outline" variant="accent" full onPress={() => openLink(directoryUrl())} />
      ) : null}
      {contact?.phone ? (
        <Button
          label={t('support.messageTrusted', { name: contact.name || t('trusted.someone') })}
          icon="chatbubble-ellipses-outline"
          variant="soft"
          full
          onPress={() => {
            void messageTrustedPerson();
          }}
        />
      ) : (
        <Button label={t('support.addTrusted')} icon="person-add-outline" variant="secondary" full onPress={() => go('/connect/trusted')} />
      )}
      <Button label={t('support.grounding')} icon="leaf-outline" variant="secondary" full onPress={() => go('/mind/grounding')} />
      <Button label={t('support.allOptions')} icon="list-outline" variant="ghost" full onPress={() => go('/help')} />
      <Text variant="caption" color="textMuted" align="center">
        {t('support.footer')}
      </Text>
      <Button label={t('support.okay')} variant="ghost" full onPress={hide} />
    </Sheet>
  );
}
