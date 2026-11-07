import { getContent } from '@/i18n';
import { containsDistress } from '@/safety/detect';
import { useApp } from '@/store/app';

/**
 * Checks text on the device and, if it may signal distress, gently opens the
 * support sheet. Returns true when support was shown. Nothing is sent anywhere.
 */
export function offerSupportIfNeeded(text: string, source: string): boolean {
  if (!text) return false;
  if (!containsDistress(text, getContent().safety.distressPhrases)) return false;
  useApp.getState().showSupport(source);
  return true;
}
