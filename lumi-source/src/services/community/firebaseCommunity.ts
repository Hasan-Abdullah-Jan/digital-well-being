/**
 * Cloud implementation of the community features using Firebase Auth (anonymous) + Firestore.
 * Security is enforced by firebase/firestore.rules — this file only shapes the requests.
 */
import { FirebaseError } from 'firebase/app';
import { deleteUser, signInAnonymously, signOut as fbSignOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { t } from '@/i18n';
import { getFirebase } from '@/services/firebase/app';
import { useApp } from '@/store/app';

import {
  CommunityError,
  type AnonNote,
  type CommunityEvent,
  type CommunityService,
  type NoteMessage,
  type PeerPost,
  type PeerReply,
  type PostStatus,
  type ReactionType,
  type StaffRoles,
} from './types';

function millis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
}

type Snap = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>;

function data(snap: Snap): DocumentData {
  return snap.data({ serverTimestamps: 'estimate' }) ?? {};
}

function toPost(snap: Snap): PeerPost {
  const d = data(snap);
  return {
    id: snap.id,
    authorId: String(d.authorId ?? ''),
    alias: String(d.alias ?? ''),
    topic: String(d.topic ?? 'other'),
    text: String(d.text ?? ''),
    status: (d.status as PostStatus) ?? 'pending',
    createdAt: millis(d.createdAt),
    reactions: {
      hear: Number(d.reactions?.hear ?? 0),
      strength: Number(d.reactions?.strength ?? 0),
      metoo: Number(d.reactions?.metoo ?? 0),
    },
    reportCount: Number(d.reportCount ?? 0),
    replyCount: Number(d.replyCount ?? 0),
  };
}

function toReply(snap: Snap): PeerReply {
  const d = data(snap);
  return {
    id: snap.id,
    postId: String(d.postId ?? ''),
    authorId: String(d.authorId ?? ''),
    alias: String(d.alias ?? ''),
    text: String(d.text ?? ''),
    status: (d.status as PostStatus) ?? 'pending',
    createdAt: millis(d.createdAt),
    fromStaff: d.fromStaff === true,
  };
}

function toNote(snap: Snap): AnonNote {
  const d = data(snap);
  return {
    id: snap.id,
    authorId: String(d.authorId ?? ''),
    topic: String(d.topic ?? 'other'),
    status: (d.status as AnonNote['status']) ?? 'open',
    createdAt: millis(d.createdAt),
    lastMessageAt: millis(d.lastMessageAt),
  };
}

function toEvent(snap: Snap): CommunityEvent {
  const d = data(snap);
  return {
    id: snap.id,
    title: String(d.title ?? ''),
    description: String(d.description ?? ''),
    category: String(d.category ?? 'other'),
    startsAt: millis(d.startsAt),
    location: String(d.location ?? ''),
    link: d.link ? String(d.link) : undefined,
    createdAt: millis(d.createdAt),
  };
}

function wrap(error: unknown): CommunityError {
  if (error instanceof CommunityError) return error;
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'auth/admin-restricted-operation') {
      return new CommunityError('permission', error.message);
    }
    if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
      return new CommunityError('offline', error.message);
    }
  }
  return new CommunityError('unknown', error instanceof Error ? error.message : String(error));
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw wrap(error);
  }
}

const byNewest = <T extends { createdAt: number }>(a: T, b: T) => b.createdAt - a.createdAt;

export class FirebaseCommunityService implements CommunityService {
  readonly mode = 'cloud' as const;

  private get db(): Firestore {
    return getFirebase().db;
  }

  currentUserId(): string | null {
    try {
      return getFirebase().auth.currentUser?.uid ?? null;
    } catch {
      return null;
    }
  }

  async ensureSignedIn(): Promise<string> {
    return guarded(async () => {
      const { auth } = getFirebase();
      await auth.authStateReady();
      if (auth.currentUser) return auth.currentUser.uid;
      const result = await signInAnonymously(auth);
      return result.user.uid;
    });
  }

  private async uid(): Promise<string> {
    return this.ensureSignedIn();
  }

  async signOut(): Promise<void> {
    await guarded(() => fbSignOut(getFirebase().auth));
  }

  async listPosts(): Promise<PeerPost[]> {
    return guarded(async () => {
      await this.uid();
      const posts = collection(this.db, 'peerPosts');
      try {
        const snap = await getDocs(
          query(posts, where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(50)),
        );
        return snap.docs.map(toPost);
      } catch (error) {
        // The composite index may not be deployed yet: fall back to an unordered query.
        if (error instanceof FirebaseError && error.code === 'failed-precondition') {
          const snap = await getDocs(query(posts, where('status', '==', 'published'), limit(100)));
          return snap.docs.map(toPost).sort(byNewest).slice(0, 50);
        }
        throw error;
      }
    });
  }

  async listMyPosts(): Promise<PeerPost[]> {
    return guarded(async () => {
      const uid = await this.uid();
      const snap = await getDocs(query(collection(this.db, 'peerPosts'), where('authorId', '==', uid), limit(100)));
      return snap.docs.map(toPost).sort(byNewest);
    });
  }

  async getPost(id: string): Promise<PeerPost | null> {
    return guarded(async () => {
      await this.uid();
      const snap = await getDoc(doc(this.db, 'peerPosts', id));
      return snap.exists() ? toPost(snap) : null;
    });
  }

  async createPost(input: { topic: string; text: string; alias: string }): Promise<PeerPost> {
    return guarded(async () => {
      const uid = await this.uid();
      const ref = doc(collection(this.db, 'peerPosts'));
      const batch = writeBatch(this.db);
      batch.set(ref, {
        authorId: uid,
        alias: input.alias,
        topic: input.topic,
        text: input.text,
        status: 'pending',
        createdAt: serverTimestamp(),
        reactions: { hear: 0, strength: 0, metoo: 0 },
        reportCount: 0,
        replyCount: 0,
      });
      await batch.commit();
      return {
        id: ref.id,
        authorId: uid,
        alias: input.alias,
        topic: input.topic,
        text: input.text,
        status: 'pending',
        createdAt: Date.now(),
        reactions: { hear: 0, strength: 0, metoo: 0 },
        reportCount: 0,
        replyCount: 0,
      };
    });
  }

  async deletePost(id: string): Promise<void> {
    await guarded(async () => {
      await this.uid();
      await deleteDoc(doc(this.db, 'peerPosts', id));
    });
  }

  async react(postId: string, type: ReactionType): Promise<void> {
    await guarded(async () => {
      const uid = await this.uid();
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'peerPosts', postId, 'reactions', uid), {
        type,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(this.db, 'peerPosts', postId), { [`reactions.${type}`]: increment(1) });
      await batch.commit();
    });
  }

  async report(postId: string, reason: string): Promise<void> {
    await guarded(async () => {
      const uid = await this.uid();
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'peerPosts', postId, 'reports', uid), {
        reason,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(this.db, 'peerPosts', postId), { reportCount: increment(1) });
      await batch.commit();
    });
  }

  async listReplies(postId: string): Promise<PeerReply[]> {
    return guarded(async () => {
      const uid = await this.uid();
      const replies = collection(this.db, 'peerReplies');
      const [published, mine] = await Promise.all([
        getDocs(query(replies, where('postId', '==', postId), where('status', '==', 'published'), limit(100))),
        getDocs(query(replies, where('postId', '==', postId), where('authorId', '==', uid), limit(50))),
      ]);
      const map = new Map<string, PeerReply>();
      for (const snap of [...published.docs, ...mine.docs]) map.set(snap.id, toReply(snap));
      return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
    });
  }

  async createReply(postId: string, input: { text: string; alias: string }): Promise<PeerReply> {
    return guarded(async () => {
      const uid = await this.uid();
      // Replies from the wellbeing team are labelled; moderators' replies appear right away.
      const staff = useApp.getState().staff;
      const fromStaff = !!staff && (staff.moderator || staff.helper);
      const status: PostStatus = staff?.moderator ? 'published' : 'pending';
      const alias = fromStaff ? t('peer.team') : input.alias;
      const ref = doc(collection(this.db, 'peerReplies'));
      const batch = writeBatch(this.db);
      batch.set(ref, {
        postId,
        authorId: uid,
        alias,
        text: input.text,
        status,
        fromStaff,
        createdAt: serverTimestamp(),
      });
      if (status === 'published') batch.update(doc(this.db, 'peerPosts', postId), { replyCount: increment(1) });
      await batch.commit();
      return { id: ref.id, postId, authorId: uid, alias, text: input.text, status, fromStaff, createdAt: Date.now() };
    });
  }

  async listEvents(): Promise<CommunityEvent[]> {
    return guarded(async () => {
      const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const snap = await getDocs(
        query(collection(this.db, 'events'), where('startsAt', '>=', since), orderBy('startsAt', 'asc'), limit(50)),
      );
      return snap.docs.map(toEvent);
    });
  }

  async listMyNotes(): Promise<AnonNote[]> {
    return guarded(async () => {
      const uid = await this.uid();
      const snap = await getDocs(query(collection(this.db, 'anonNotes'), where('authorId', '==', uid), limit(50)));
      return snap.docs.map(toNote).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    });
  }

  async createNote(input: { topic: string; text: string }): Promise<AnonNote> {
    return guarded(async () => {
      const uid = await this.uid();
      const noteRef = doc(collection(this.db, 'anonNotes'));
      const messageRef = doc(collection(this.db, 'anonNotes', noteRef.id, 'messages'));
      const batch = writeBatch(this.db);
      batch.set(noteRef, {
        authorId: uid,
        topic: input.topic,
        status: 'open',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      batch.set(messageRef, { from: 'author', text: input.text, createdAt: serverTimestamp() });
      await batch.commit();
      const now = Date.now();
      return { id: noteRef.id, authorId: uid, topic: input.topic, status: 'open', createdAt: now, lastMessageAt: now };
    });
  }

  async listNoteMessages(noteId: string): Promise<NoteMessage[]> {
    return guarded(async () => {
      await this.uid();
      const snap = await getDocs(
        query(collection(this.db, 'anonNotes', noteId, 'messages'), orderBy('createdAt', 'asc'), limit(200)),
      );
      return snap.docs.map((d) => {
        const v = data(d);
        return {
          id: d.id,
          noteId,
          from: v.from === 'helper' ? 'helper' : 'author',
          text: String(v.text ?? ''),
          createdAt: millis(v.createdAt),
        };
      });
    });
  }

  async sendNoteMessage(noteId: string, text: string): Promise<void> {
    await guarded(async () => {
      await this.uid();
      const batch = writeBatch(this.db);
      batch.set(doc(collection(this.db, 'anonNotes', noteId, 'messages')), {
        from: 'author',
        text,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(this.db, 'anonNotes', noteId), { status: 'open', lastMessageAt: serverTimestamp() });
      await batch.commit();
    });
  }

  async closeNote(noteId: string): Promise<void> {
    await guarded(async () => {
      await this.uid();
      await updateDoc(doc(this.db, 'anonNotes', noteId), { status: 'closed' });
    });
  }

  async getStaffRoles(): Promise<StaffRoles> {
    return guarded(async () => {
      const uid = await this.uid();
      const snap = await getDoc(doc(this.db, 'staff', uid));
      const roles = snap.exists() ? (snap.data().roles ?? {}) : {};
      return {
        moderator: roles.moderator === true,
        helper: roles.helper === true,
        organiser: roles.organiser === true,
      };
    });
  }

  async listPendingPosts(): Promise<PeerPost[]> {
    return guarded(async () => {
      await this.uid();
      const snap = await getDocs(query(collection(this.db, 'peerPosts'), where('status', '==', 'pending'), limit(100)));
      return snap.docs.map(toPost).sort((a, b) => a.createdAt - b.createdAt);
    });
  }

  async listReportedPosts(): Promise<PeerPost[]> {
    return guarded(async () => {
      await this.uid();
      const snap = await getDocs(query(collection(this.db, 'peerPosts'), where('reportCount', '>', 0), limit(100)));
      return snap.docs
        .map(toPost)
        .filter((p) => p.status === 'published')
        .sort((a, b) => b.reportCount - a.reportCount);
    });
  }

  async listPendingReplies(): Promise<PeerReply[]> {
    return guarded(async () => {
      await this.uid();
      const snap = await getDocs(query(collection(this.db, 'peerReplies'), where('status', '==', 'pending'), limit(100)));
      return snap.docs.map(toReply).sort((a, b) => a.createdAt - b.createdAt);
    });
  }

  async moderatePost(id: string, status: PostStatus): Promise<void> {
    await guarded(async () => {
      await this.uid();
      await updateDoc(doc(this.db, 'peerPosts', id), { status, moderatedAt: serverTimestamp() });
    });
  }

  async moderateReply(id: string, status: PostStatus): Promise<void> {
    await guarded(async () => {
      await this.uid();
      const replyRef = doc(this.db, 'peerReplies', id);
      const reply = await getDoc(replyRef);
      if (!reply.exists()) return;
      const batch = writeBatch(this.db);
      batch.update(replyRef, { status, moderatedAt: serverTimestamp() });
      const wasPublished = reply.data().status === 'published';
      if (status === 'published' && !wasPublished) {
        batch.update(doc(this.db, 'peerPosts', String(reply.data().postId)), { replyCount: increment(1) });
      }
      await batch.commit();
    });
  }

  async listHelperNotes(): Promise<AnonNote[]> {
    return guarded(async () => {
      await this.uid();
      const snap = await getDocs(query(collection(this.db, 'anonNotes'), orderBy('lastMessageAt', 'desc'), limit(100)));
      return snap.docs.map(toNote).filter((n) => n.status !== 'closed');
    });
  }

  async helperReply(noteId: string, text: string): Promise<void> {
    await guarded(async () => {
      await this.uid();
      const batch = writeBatch(this.db);
      batch.set(doc(collection(this.db, 'anonNotes', noteId, 'messages')), {
        from: 'helper',
        text,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(this.db, 'anonNotes', noteId), { status: 'answered', lastMessageAt: serverTimestamp() });
      await batch.commit();
    });
  }

  async createEvent(input: Omit<CommunityEvent, 'id' | 'createdAt'>): Promise<void> {
    await guarded(async () => {
      const uid = await this.uid();
      const batch = writeBatch(this.db);
      batch.set(doc(collection(this.db, 'events')), {
        title: input.title,
        description: input.description,
        category: input.category,
        startsAt: Timestamp.fromMillis(input.startsAt),
        location: input.location,
        link: input.link ?? '',
        createdAt: serverTimestamp(),
        createdBy: uid,
      });
      await batch.commit();
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await guarded(async () => {
      await this.uid();
      await deleteDoc(doc(this.db, 'events', id));
    });
  }

  async deleteMyCloudData(localHints: { reactedPostIds: string[]; reportedPostIds: string[] }): Promise<void> {
    await guarded(async () => {
      const { auth } = getFirebase();
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) return; // Never signed in: nothing is stored in the cloud.
      const uid = user.uid;
      const db = this.db;
      const refs: ReturnType<typeof doc>[] = [];

      const [posts, replies, notes] = await Promise.all([
        getDocs(query(collection(db, 'peerPosts'), where('authorId', '==', uid))),
        getDocs(query(collection(db, 'peerReplies'), where('authorId', '==', uid))),
        getDocs(query(collection(db, 'anonNotes'), where('authorId', '==', uid))),
      ]);
      posts.docs.forEach((d) => refs.push(d.ref));
      replies.docs.forEach((d) => refs.push(d.ref));
      for (const note of notes.docs) {
        const messages = await getDocs(collection(db, 'anonNotes', note.id, 'messages'));
        messages.docs.forEach((m) => refs.push(m.ref));
        refs.push(note.ref);
      }
      localHints.reactedPostIds.forEach((postId) => refs.push(doc(db, 'peerPosts', postId, 'reactions', uid)));
      localHints.reportedPostIds.forEach((postId) => refs.push(doc(db, 'peerPosts', postId, 'reports', uid)));

      for (let i = 0; i < refs.length; i += 400) {
        const batch = writeBatch(db);
        refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
        try {
          await batch.commit();
        } catch (error) {
          // A reaction/report on a post that no longer exists can fail; delete the rest one by one.
          for (const ref of refs.slice(i, i + 400)) {
            await deleteDoc(ref).catch(() => undefined);
          }
          if (!(error instanceof FirebaseError)) throw error;
        }
      }

      try {
        await deleteUser(user);
      } catch {
        // Firebase can ask for a "recent login", which anonymous accounts cannot do.
        // Your data is already deleted; signing out leaves an empty anonymous account.
        await fbSignOut(auth);
      }
    });
  }
}
