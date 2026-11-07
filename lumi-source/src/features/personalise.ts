/** Personalisation: turns onboarding answers into suggestions. */
import type { ConcernId, GoalId } from '@/store/types';

/** Which goals we suggest for each concern (the user can change them). */
export const CONCERN_TO_GOALS: Record<ConcernId, GoalId[]> = {
  scrolling: ['scroll-less'],
  sleep: ['sleep-better'],
  focus: ['focus'],
  gaming: ['game-balance'],
  comparison: ['self-worth'],
  escapism: ['scroll-less', 'connect'],
  lonely: ['connect'],
  stress: ['calm'],
  'low-mood': ['calm', 'self-worth'],
  harassment: ['safe-online'],
  content: ['safe-online'],
};

export type ToolId =
  | 'usage'
  | 'limits'
  | 'bedtime'
  | 'focus'
  | 'gaming'
  | 'reality'
  | 'after-scroll'
  | 'journal'
  | 'nudges'
  | 'peer'
  | 'breathe'
  | 'grounding'
  | 'sleep'
  | 'stress'
  | 'safety'
  | 'evidence'
  | 'challenges';

/** Tools to feature on the Today screen, in order, based on what the user said matters. */
const CONCERN_TOOLS: Record<ConcernId, ToolId[]> = {
  scrolling: ['limits', 'after-scroll', 'challenges'],
  sleep: ['bedtime', 'sleep'],
  focus: ['focus', 'stress'],
  gaming: ['gaming', 'challenges'],
  comparison: ['reality', 'after-scroll', 'journal'],
  escapism: ['challenges', 'nudges', 'reality'],
  lonely: ['nudges', 'peer'],
  stress: ['breathe', 'stress'],
  'low-mood': ['journal', 'breathe', 'peer'],
  harassment: ['safety', 'evidence'],
  content: ['safety', 'grounding'],
};

export function featuredTools(concerns: ConcernId[], max = 4): ToolId[] {
  const ordered: ToolId[] = [];
  for (const concern of concerns) {
    for (const tool of CONCERN_TOOLS[concern] ?? []) if (!ordered.includes(tool)) ordered.push(tool);
  }
  for (const fallback of ['breathe', 'journal', 'focus', 'nudges'] as ToolId[]) {
    if (!ordered.includes(fallback)) ordered.push(fallback);
  }
  return ordered.slice(0, max);
}

/** Where each featured tool lives in the app. */
export const TOOLS: Record<ToolId, { icon: string; route: string; key: string }> = {
  usage: { icon: 'stats-chart-outline', route: '/habits/usage', key: 'tools.usage' },
  limits: { icon: 'hand-left-outline', route: '/habits/limits', key: 'tools.limits' },
  bedtime: { icon: 'moon-outline', route: '/habits/bedtime', key: 'tools.bedtime' },
  focus: { icon: 'flash-outline', route: '/habits/focus', key: 'tools.focus' },
  gaming: { icon: 'game-controller-outline', route: '/habits/gaming', key: 'tools.gaming' },
  reality: { icon: 'albums-outline', route: '/mind/reality', key: 'tools.reality' },
  'after-scroll': { icon: 'phone-portrait-outline', route: '/mind/after-scroll', key: 'tools.afterScroll' },
  journal: { icon: 'book-outline', route: '/mind/journal', key: 'tools.journal' },
  nudges: { icon: 'people-outline', route: '/connect/nudges', key: 'tools.nudges' },
  peer: { icon: 'chatbubbles-outline', route: '/connect/peer', key: 'tools.peer' },
  breathe: { icon: 'leaf-outline', route: '/mind/breathe', key: 'tools.breathe' },
  grounding: { icon: 'hand-right-outline', route: '/mind/grounding', key: 'tools.grounding' },
  sleep: { icon: 'bed-outline', route: '/mind/sleep', key: 'tools.sleep' },
  stress: { icon: 'pulse-outline', route: '/mind/stress', key: 'tools.stress' },
  safety: { icon: 'shield-checkmark-outline', route: '/connect/safety', key: 'tools.safety' },
  evidence: { icon: 'folder-open-outline', route: '/connect/evidence', key: 'tools.evidence' },
  challenges: { icon: 'trophy-outline', route: '/me/challenges', key: 'tools.challenges' },
};
