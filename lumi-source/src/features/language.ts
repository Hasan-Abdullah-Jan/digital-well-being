import * as Localization from 'expo-localization';

import { setLanguage, supportedLanguage } from '@/i18n';
import { useSettings } from '@/store/settings';

/** Applies the language chosen in settings ("system" follows the phone). */
export function applyLanguage(): void {
  const pref = useSettings.getState().language;
  const device = Localization.getLocales()[0]?.languageCode ?? 'en';
  setLanguage(supportedLanguage(pref === 'system' ? device : pref));
}
