import { parseContact, smsHref } from '@/utils/contact';

describe('parseContact', () => {
  it('understands phone numbers', () => {
    expect(parseContact('+44 116 123')).toMatchObject({ kind: 'phone', href: 'tel:+44116123' });
    expect(parseContact('tel:112')).toMatchObject({ kind: 'phone', href: 'tel:112' });
  });
  it('understands sms, email and web', () => {
    expect(parseContact('sms:741741')).toMatchObject({ kind: 'sms', href: 'sms:741741' });
    expect(parseContact('help@school.org')).toMatchObject({ kind: 'email', href: 'mailto:help@school.org' });
    expect(parseContact('https://findahelpline.com')).toMatchObject({ kind: 'web', display: 'findahelpline.com' });
    expect(parseContact('example.org/chat')).toMatchObject({ kind: 'web', href: 'https://example.org/chat' });
  });
  it('ignores empty or unknown values', () => {
    expect(parseContact('').kind).toBe('none');
    expect(parseContact('call someone').kind).toBe('none');
  });
  it('builds sms links with a message body', () => {
    expect(smsHref('+1 555 0100', 'Can we talk?')).toBe('sms:+15550100?body=Can%20we%20talk%3F');
  });
});
