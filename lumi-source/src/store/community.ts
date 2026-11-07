import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  AnonNote,
  CommunityEvent,
  NoteMessage,
  PeerPost,
  PeerReply,
  ReactionType,
} from '@/services/community/types';

import { persistOptions } from './storage';

/**
 * Local memory for community features: which posts you reacted to or reported,
 * events you're interested in, and (in demo mode only) the demo community content.
 */
export type CommunityLocalData = {
  reactions: Record<string, ReactionType>;
  reported: Record<string, number>;
  interestedEvents: string[];
  demoPosts: PeerPost[];
  demoReplies: PeerReply[];
  demoNotes: AnonNote[];
  demoNoteMessages: NoteMessage[];
  demoEvents: CommunityEvent[];
};

type CommunityLocalActions = {
  setReaction: (postId: string, type: ReactionType) => void;
  setReported: (postId: string) => void;
  toggleInterested: (eventId: string) => void;
  patch: (patch: Partial<CommunityLocalData>) => void;
};

export type CommunityLocalState = CommunityLocalData & CommunityLocalActions;

export const initialCommunityLocal = (): CommunityLocalData => ({
  reactions: {},
  reported: {},
  interestedEvents: [],
  demoPosts: [],
  demoReplies: [],
  demoNotes: [],
  demoNoteMessages: [],
  demoEvents: [],
});

export const useCommunityLocal = create<CommunityLocalState>()(
  persist(
    (set) => ({
      ...initialCommunityLocal(),
      setReaction: (postId, type) => set((s) => ({ reactions: { ...s.reactions, [postId]: type } })),
      setReported: (postId) => set((s) => ({ reported: { ...s.reported, [postId]: Date.now() } })),
      toggleInterested: (eventId) =>
        set((s) => ({
          interestedEvents: s.interestedEvents.includes(eventId)
            ? s.interestedEvents.filter((id) => id !== eventId)
            : [...s.interestedEvents, eventId],
        })),
      patch: (patch) => set(patch),
    }),
    persistOptions<CommunityLocalState>('community', initialCommunityLocal),
  ),
);
