/** Opening real-person help: helpline, trusted contact, emergency number. */
import * as Linking from 'expo-linking';

import { appConfig } from '@/config';
import { t } from '@/i18n';
import { useApp } from '@/store/app';
import { useSettings } from '@/store/settings';
import { cleanNumber, parseContact, smsHref, type ParsedContact } from '@/utils/contact';

export type HelpOption = ParsedContact & { id: string; label: string; icon: string };

/** All configured ways to reach the helpline from config/.env. */
export function helplineOptions(): HelpOption[] {
  const { help } = appConfig;
  const name = help.name || t('help.helplineDefaultName');
  const options: HelpOption[] = [];
  const primary = parseContact(help.contact);
  if (primary.kind !== 'none') {
    const label =
      primary.kind === 'phone'
        ? t('help.callName', { name })
        : primary.kind === 'sms'
          ? t('help.textName', { name })
          : primary.kind === 'email'
            ? t('help.emailName', { name })
            : t('help.visitName', { name });
    const icon = { phone: 'call', sms: 'chatbubble', email: 'mail', web: 'globe', none: 'help' }[primary.kind];
    options.push({ ...primary, id: 'primary', label, icon });
  }
  if (help.textNumber) {
    const sms = parseContact(help.textNumber.startsWith('sms:') ? help.textNumber : `sms:${help.textNumber}`);
    if (sms.kind !== 'none') options.push({ ...sms, id: 'text', label: t('help.textName', { name }), icon: 'chatbubble' });
  }
  if (help.website) {
    const web = parseContact(help.website);
    if (web.kind !== 'none') options.push({ ...web, id: 'web', label: t('help.chatName', { name }), icon: 'globe' });
  }
  return options;
}

export function helplineConfigured(): boolean {
  return helplineOptions().length > 0;
}

export async function openLink(href: string): Promise<boolean> {
  try {
    await Linking.openURL(href);
    return true;
  } catch {
    useApp.getState().showToast(t('help.openFailed'));
    return false;
  }
}

export function emergencyHref(): string {
  const number = appConfig.help.emergencyNumber;
  return number ? `tel:${cleanNumber(number)}` : 'tel:';
}

export function directoryUrl(): string {
  return appConfig.help.directoryUrl;
}

export function trustedContact() {
  return useSettings.getState().trustedContact;
}

export async function messageTrustedPerson(): Promise<boolean> {
  const contact = trustedContact();
  if (!contact?.phone) return false;
  const body = contact.message || t('trusted.defaultMessage');
  return openLink(smsHref(contact.phone, body));
}

export async function callTrustedPerson(): Promise<boolean> {
  const contact = trustedContact();
  if (!contact?.phone) return false;
  return openLink(`tel:${cleanNumber(contact.phone)}`);
}
