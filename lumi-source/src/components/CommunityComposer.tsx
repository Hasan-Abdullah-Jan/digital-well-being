/** Shared validation for anything posted to the community. Runs on the phone. */
import { getContent, t } from '@/i18n';
import { checkCommunityText, type TextIssue } from '@/safety/detect';

export function communityIssues(text: string, maxLength: number): TextIssue[] {
  return checkCommunityText(text, { maxLength, blockedWords: getContent().safety.blockedWords });
}

export function issueMessage(issues: TextIssue[]): string | undefined {
  if (issues.length === 0 || (issues.length === 1 && issues[0] === 'empty')) return undefined;
  return issues
    .filter((i) => i !== 'empty')
    .map((i) => t(`community.issues.${i}`))
    .join(' ');
}
