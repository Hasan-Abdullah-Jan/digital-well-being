/**
 * Picks the community implementation:
 *  - demo mode            -> DemoCommunityService (local seed data)
 *  - Firebase configured  -> FirebaseCommunityService
 *  - otherwise            -> unavailable (screens show a friendly explanation)
 */
import { cloudAvailable } from '@/config';
import { getContent } from '@/i18n';
import { useApp } from '@/store/app';

import { DemoCommunityService, setDemoHelperReply } from './demoCommunity';
import { FirebaseCommunityService } from './firebaseCommunity';
import type { CommunityMode, CommunityService } from './types';

let demoService: DemoCommunityService | null = null;
let cloudService: FirebaseCommunityService | null = null;

export function communityMode(): CommunityMode {
  if (useApp.getState().demoMode) return 'demo';
  return cloudAvailable ? 'cloud' : 'unavailable';
}

export function getCommunity(): CommunityService | null {
  const mode = communityMode();
  if (mode === 'demo') {
    setDemoHelperReply(getContent().demoHelperReply);
    demoService ??= new DemoCommunityService();
    return demoService;
  }
  if (mode === 'cloud') {
    cloudService ??= new FirebaseCommunityService();
    return cloudService;
  }
  return null;
}

export function useCommunityMode(): CommunityMode {
  const demo = useApp((s) => s.demoMode);
  if (demo) return 'demo';
  return cloudAvailable ? 'cloud' : 'unavailable';
}

export * from './types';
