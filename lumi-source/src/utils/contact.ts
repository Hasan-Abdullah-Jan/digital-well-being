/**
 * Turns a helpline/trusted-contact value from config/.env into something we can open.
 * Accepts phone numbers, tel:/sms:/mailto: links, plain emails and web addresses.
 */
export type ContactKind = 'phone' | 'sms' | 'email' | 'web' | 'none';

export type ParsedContact = {
  kind: ContactKind;
  /** What we show to the user. */
  display: string;
  /** What we open with Linking.openURL. */
  href: string;
};

const NONE: ParsedContact = { kind: 'none', display: '', href: '' };

export function parseContact(raw: string | null | undefined): ParsedContact {
  const value = (raw ?? '').trim();
  if (!value) return NONE;
  const lower = value.toLowerCase();

  if (lower.startsWith('tel:')) {
    const number = value.slice(4).trim();
    return number ? { kind: 'phone', display: number, href: `tel:${cleanNumber(number)}` } : NONE;
  }
  if (lower.startsWith('sms:')) {
    const number = value.slice(4).trim();
    return number ? { kind: 'sms', display: number, href: `sms:${cleanNumber(number)}` } : NONE;
  }
  if (lower.startsWith('mailto:')) {
    const email = value.slice(7).trim();
    return email ? { kind: 'email', display: email, href: `mailto:${email}` } : NONE;
  }
  if (/^https?:\/\//i.test(value)) {
    return { kind: 'web', display: value.replace(/^https?:\/\//i, '').replace(/\/$/, ''), href: value };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { kind: 'email', display: value, href: `mailto:${value}` };
  }
  if (/^\+?[\d\s().-]{3,}$/.test(value) && /\d/.test(value)) {
    return { kind: 'phone', display: value, href: `tel:${cleanNumber(value)}` };
  }
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(value)) {
    return { kind: 'web', display: value, href: `https://${value}` };
  }
  return NONE;
}

export function cleanNumber(value: string): string {
  return value.replace(/[^\d+*#]/g, '');
}

export function smsHref(number: string, body?: string): string {
  const clean = cleanNumber(number);
  if (!body) return `sms:${clean}`;
  // "?body=" works on Android and iOS 8+.
  return `sms:${clean}?body=${encodeURIComponent(body)}`;
}
