/**
 * Demo implementation: everything stays on this device, using seed data.
 * A pretend moderator approves new posts after a few seconds and a pretend helper
 * answers anonymous notes, so the full flow can be shown without a backend.
 */
import { useCommunityLocal } from '@/store/community';
import { makeId } from '@/utils/misc';

import type {
  AnonNote,
  CommunityEvent,
  CommunityService,
  NoteMessage,
  PeerPost,
  PeerReply,
  PostStatus,
  ReactionType,
  StaffRoles,
} from './types';

const DEMO_UID = 'demo-you';
const AUTO_APPROVE_MS = 8_000;
const AUTO_REPLY_MS = 10_000;

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const store = () => useCommunityLocal.getState();

let demoHelperReply = 'Thank you for writing this. (Demo reply.)';

/** The demo helper reply text comes from the localised content (set by the community index). */
export function setDemoHelperReply(text: string) {
  demoHelperReply = text;
}

function settle() {
  const now = Date.now();
  const s = store();
  let changed = false;
  const demoPosts = s.demoPosts.map((p) => {
    if (p.status === 'pending' && now - p.createdAt > AUTO_APPROVE_MS) {
      changed = true;
      return { ...p, status: 'published' as PostStatus };
    }
    return p;
  });
  const demoReplies = s.demoReplies.map((r) => {
    if (r.status === 'pending' && now - r.createdAt > AUTO_APPROVE_MS) {
      changed = true;
      return { ...r, status: 'published' as PostStatus };
    }
    return r;
  });
  const postsWithCounts = demoPosts.map((p) => ({
    ...p,
    replyCount: demoReplies.filter((r) => r.postId === p.id && r.status === 'published').length,
  }));
  const demoNoteMessages = [...s.demoNoteMessages];
  const demoNotes = s.demoNotes.map((n) => {
    const messages = demoNoteMessages.filter((m) => m.noteId === n.id);
    const last = messages[messages.length - 1];
    if (n.status === 'open' && last && last.from === 'author' && now - last.createdAt > AUTO_REPLY_MS) {
      changed = true;
      const at = last.createdAt + AUTO_REPLY_MS;
      demoNoteMessages.push({ id: makeId('nm'), noteId: n.id, from: 'helper', text: demoHelperReply, createdAt: at });
      return { ...n, status: 'answered' as const, lastMessageAt: at };
    }
    return n;
  });
  if (changed) s.patch({ demoPosts: postsWithCounts, demoReplies, demoNotes, demoNoteMessages });
}

export class DemoCommunityService implements CommunityService {
  readonly mode = 'demo' as const;

  async ensureSignedIn() {
    return DEMO_UID;
  }

  currentUserId() {
    return DEMO_UID;
  }

  async signOut() {}

  async listPosts(): Promise<PeerPost[]> {
    await delay();
    settle();
    return store()
      .demoPosts.filter((p) => p.status === 'published' && p.reportCount < 3)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async listMyPosts(): Promise<PeerPost[]> {
    await delay();
    settle();
    return store()
      .demoPosts.filter((p) => p.authorId === DEMO_UID)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getPost(id: string) {
    settle();
    return store().demoPosts.find((p) => p.id === id) ?? null;
  }

  async createPost(input: { topic: string; text: string; alias: string }): Promise<PeerPost> {
    await delay();
    const post: PeerPost = {
      id: makeId('dp'),
      authorId: DEMO_UID,
      alias: input.alias,
      topic: input.topic,
      text: input.text,
      status: 'pending',
      createdAt: Date.now(),
      reactions: { hear: 0, strength: 0, metoo: 0 },
      reportCount: 0,
      replyCount: 0,
    };
    store().patch({ demoPosts: [...store().demoPosts, post] });
    return post;
  }

  async deletePost(id: string) {
    await delay();
    const s = store();
    s.patch({
      demoPosts: s.demoPosts.filter((p) => p.id !== id),
      demoReplies: s.demoReplies.filter((r) => r.postId !== id),
    });
  }

  async react(postId: string, type: ReactionType) {
    await delay(120);
    const s = store();
    s.patch({
      demoPosts: s.demoPosts.map((p) =>
        p.id === postId ? { ...p, reactions: { ...p.reactions, [type]: p.reactions[type] + 1 } } : p,
      ),
    });
  }

  async report(postId: string) {
    await delay(120);
    const s = store();
    s.patch({
      demoPosts: s.demoPosts.map((p) => (p.id === postId ? { ...p, reportCount: p.reportCount + 1 } : p)),
    });
  }

  async listReplies(postId: string): Promise<PeerReply[]> {
    await delay();
    settle();
    return store()
      .demoReplies.filter((r) => r.postId === postId && (r.status === 'published' || r.authorId === DEMO_UID))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async createReply(postId: string, input: { text: string; alias: string }): Promise<PeerReply> {
    await delay();
    const reply: PeerReply = {
      id: makeId('dr'),
      postId,
      authorId: DEMO_UID,
      alias: input.alias,
      text: input.text,
      status: 'pending',
      createdAt: Date.now(),
      fromStaff: false,
    };
    store().patch({ demoReplies: [...store().demoReplies, reply] });
    return reply;
  }

  async listEvents(): Promise<CommunityEvent[]> {
    await delay();
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return store()
      .demoEvents.filter((e) => e.startsAt >= since)
      .sort((a, b) => a.startsAt - b.startsAt);
  }

  async listMyNotes(): Promise<AnonNote[]> {
    await delay();
    settle();
    return [...store().demoNotes].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  async createNote(input: { topic: string; text: string }): Promise<AnonNote> {
    await delay();
    const now = Date.now();
    const note: AnonNote = { id: makeId('dn'), authorId: DEMO_UID, topic: input.topic, status: 'open', createdAt: now, lastMessageAt: now };
    const message: NoteMessage = { id: makeId('nm'), noteId: note.id, from: 'author', text: input.text, createdAt: now };
    const s = store();
    s.patch({ demoNotes: [...s.demoNotes, note], demoNoteMessages: [...s.demoNoteMessages, message] });
    return note;
  }

  async listNoteMessages(noteId: string): Promise<NoteMessage[]> {
    await delay();
    settle();
    return store()
      .demoNoteMessages.filter((m) => m.noteId === noteId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async sendNoteMessage(noteId: string, text: string) {
    await delay();
    const now = Date.now();
    const s = store();
    s.patch({
      demoNoteMessages: [...s.demoNoteMessages, { id: makeId('nm'), noteId, from: 'author', text, createdAt: now }],
      demoNotes: s.demoNotes.map((n) => (n.id === noteId ? { ...n, status: 'open', lastMessageAt: now } : n)),
    });
  }

  async closeNote(noteId: string) {
    const s = store();
    s.patch({ demoNotes: s.demoNotes.map((n) => (n.id === noteId ? { ...n, status: 'closed' } : n)) });
  }

  async getStaffRoles(): Promise<StaffRoles> {
    // In demo mode you can explore the team tools too.
    return { moderator: true, helper: true, organiser: true };
  }

  async listPendingPosts() {
    await delay();
    return store().demoPosts.filter((p) => p.status === 'pending');
  }

  async listReportedPosts() {
    await delay();
    return store().demoPosts.filter((p) => p.status === 'published' && p.reportCount > 0);
  }

  async listPendingReplies() {
    await delay();
    return store().demoReplies.filter((r) => r.status === 'pending');
  }

  async moderatePost(id: string, status: PostStatus) {
    const s = store();
    s.patch({ demoPosts: s.demoPosts.map((p) => (p.id === id ? { ...p, status } : p)) });
  }

  async moderateReply(id: string, status: PostStatus) {
    const s = store();
    s.patch({ demoReplies: s.demoReplies.map((r) => (r.id === id ? { ...r, status } : r)) });
    settle();
  }

  async listHelperNotes() {
    await delay();
    settle();
    return store().demoNotes.filter((n) => n.status !== 'closed');
  }

  async helperReply(noteId: string, text: string) {
    const now = Date.now();
    const s = store();
    s.patch({
      demoNoteMessages: [...s.demoNoteMessages, { id: makeId('nm'), noteId, from: 'helper', text, createdAt: now }],
      demoNotes: s.demoNotes.map((n) => (n.id === noteId ? { ...n, status: 'answered', lastMessageAt: now } : n)),
    });
  }

  async createEvent(input: Omit<CommunityEvent, 'id' | 'createdAt'>) {
    const s = store();
    s.patch({ demoEvents: [...s.demoEvents, { ...input, id: makeId('de'), createdAt: Date.now() }] });
  }

  async deleteEvent(id: string) {
    const s = store();
    s.patch({ demoEvents: s.demoEvents.filter((e) => e.id !== id) });
  }

  async deleteMyCloudData() {
    const s = store();
    s.patch({
      demoPosts: s.demoPosts.filter((p) => p.authorId !== DEMO_UID),
      demoReplies: s.demoReplies.filter((r) => r.authorId !== DEMO_UID),
      demoNotes: [],
      demoNoteMessages: [],
    });
  }
}
