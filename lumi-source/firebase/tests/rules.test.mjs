/**
 * Lumi Firestore rules tests. Each test performs the same reads and batched writes
 * the app does (src/services/community/firebaseCommunity.ts) and checks that
 * people can only ever touch their own data.
 *
 * Run: cd firebase && npm install && npm test
 */
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

let env;

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-lumi',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host, port: Number(port) },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'staff/mod'), { roles: { moderator: true } });
    await setDoc(doc(db, 'staff/helper'), { roles: { helper: true } });
    await setDoc(doc(db, 'staff/org'), { roles: { organiser: true } });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

function newPost(uid, overrides = {}) {
  return {
    authorId: uid,
    alias: 'Calm Otter',
    topic: 'lonely',
    text: 'Feeling a bit lonely this week.',
    status: 'pending',
    createdAt: serverTimestamp(),
    reactions: { hear: 0, strength: 0, metoo: 0 },
    reportCount: 0,
    replyCount: 0,
    ...overrides,
  };
}

async function seedPost(id, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'peerPosts', id), {
      ...newPost('alice'),
      createdAt: Timestamp.now(),
      ...data,
    });
  });
}

describe('peer posts', () => {
  test('signed-out people cannot read or write posts', async () => {
    await seedPost('p1', { status: 'published' });
    await assertFails(getDoc(doc(anon(), 'peerPosts/p1')));
    await assertFails(setDoc(doc(anon(), 'peerPosts/p2'), newPost('x')));
  });

  test('a valid anonymous post starts as pending', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'peerPosts/p1'), newPost('alice')));
  });

  test('invalid posts are rejected', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'peerPosts/a'), newPost('alice', { status: 'published' })));
    await assertFails(setDoc(doc(db, 'peerPosts/b'), newPost('bob')));
    await assertFails(setDoc(doc(db, 'peerPosts/c'), newPost('alice', { text: 'x'.repeat(501) })));
    await assertFails(setDoc(doc(db, 'peerPosts/d'), newPost('alice', { topic: 'politics' })));
    await assertFails(setDoc(doc(db, 'peerPosts/e'), newPost('alice', { realName: 'Alice Smith' })));
    await assertFails(setDoc(doc(db, 'peerPosts/f'), newPost('alice', { reactions: { hear: 50, strength: 0, metoo: 0 } })));
  });

  test('pending posts are visible only to their author and moderators', async () => {
    await seedPost('p1', { status: 'pending' });
    await assertSucceeds(getDoc(doc(as('alice'), 'peerPosts/p1')));
    await assertFails(getDoc(doc(as('bob'), 'peerPosts/p1')));
    await assertSucceeds(getDoc(doc(as('mod'), 'peerPosts/p1')));
  });

  test('only moderators can publish or hide', async () => {
    await seedPost('p1', { status: 'pending' });
    await assertFails(updateDoc(doc(as('alice'), 'peerPosts/p1'), { status: 'published' }));
    await assertFails(updateDoc(doc(as('bob'), 'peerPosts/p1'), { status: 'published' }));
    await assertSucceeds(updateDoc(doc(as('mod'), 'peerPosts/p1'), { status: 'published', moderatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('mod'), 'peerPosts/p1'), { text: 'edited by staff' }));
  });

  test('feed queries must ask for published posts or your own', async () => {
    await seedPost('p1', { status: 'published' });
    await seedPost('p2', { status: 'pending', authorId: 'carol' });
    const bob = as('bob');
    await assertSucceeds(getDocs(query(collection(bob, 'peerPosts'), where('status', '==', 'published'))));
    await assertSucceeds(getDocs(query(collection(bob, 'peerPosts'), where('authorId', '==', 'bob'))));
    await assertFails(getDocs(collection(bob, 'peerPosts')));
    await assertFails(getDocs(query(collection(bob, 'peerPosts'), where('status', '==', 'pending'))));
    await assertSucceeds(getDocs(query(collection(as('mod'), 'peerPosts'), where('status', '==', 'pending'))));
  });

  test('authors and moderators can delete; others cannot', async () => {
    await seedPost('p1', { status: 'published' });
    await assertFails(deleteDoc(doc(as('bob'), 'peerPosts/p1')));
    await assertSucceeds(deleteDoc(doc(as('alice'), 'peerPosts/p1')));
    await seedPost('p2', { status: 'published' });
    await assertSucceeds(deleteDoc(doc(as('mod'), 'peerPosts/p2')));
  });
});

describe('reactions and reports', () => {
  const react = (db, postId, uid, type, by = 1) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'peerPosts', postId, 'reactions', uid), { type, createdAt: serverTimestamp() });
    batch.update(doc(db, 'peerPosts', postId), { [`reactions.${type}`]: increment(by) });
    return batch.commit();
  };

  test('one reaction per person, counted exactly once', async () => {
    await seedPost('p1', { status: 'published' });
    const bob = as('bob');
    await assertSucceeds(react(bob, 'p1', 'bob', 'hear'));
    await assertFails(react(bob, 'p1', 'bob', 'strength'));
    await assertFails(react(as('carol'), 'p1', 'carol', 'hear', 2));
    await assertFails(react(as('carol'), 'p1', 'bob', 'hear'));
  });

  test('counters cannot change without a matching reaction (and vice versa)', async () => {
    await seedPost('p1', { status: 'published' });
    const bob = as('bob');
    await assertFails(updateDoc(doc(bob, 'peerPosts/p1'), { 'reactions.hear': increment(1) }));
    await assertFails(setDoc(doc(bob, 'peerPosts/p1/reactions/bob'), { type: 'hear', createdAt: serverTimestamp() }));
  });

  test('no reactions on posts that are not published', async () => {
    await seedPost('p1', { status: 'pending' });
    await assertFails(react(as('bob'), 'p1', 'bob', 'hear'));
  });

  test('reports are anonymous, counted once, and readable only by moderators', async () => {
    await seedPost('p1', { status: 'published' });
    const bob = as('bob');
    const report = (db, uid) => {
      const batch = writeBatch(db);
      batch.set(doc(db, 'peerPosts/p1/reports', uid), { reason: 'unkind', createdAt: serverTimestamp() });
      batch.update(doc(db, 'peerPosts/p1'), { reportCount: increment(1) });
      return batch.commit();
    };
    await assertSucceeds(report(bob, 'bob'));
    await assertFails(report(bob, 'bob'));
    await assertFails(getDoc(doc(as('alice'), 'peerPosts/p1/reports/bob')));
    await assertSucceeds(getDoc(doc(as('mod'), 'peerPosts/p1/reports/bob')));
  });
});

describe('replies', () => {
  const reply = (uid, overrides = {}) => ({
    postId: 'p1',
    authorId: uid,
    alias: 'Kind Willow',
    text: 'Sending strength.',
    status: 'pending',
    fromStaff: false,
    createdAt: serverTimestamp(),
    ...overrides,
  });

  test('replies start pending and only on published posts', async () => {
    await seedPost('p1', { status: 'published' });
    await assertSucceeds(setDoc(doc(as('bob'), 'peerReplies/r1'), reply('bob')));
    await assertFails(setDoc(doc(as('bob'), 'peerReplies/r2'), reply('bob', { status: 'published' })));
    await assertFails(setDoc(doc(as('bob'), 'peerReplies/r3'), reply('bob', { fromStaff: true })));
    await seedPost('p2', { status: 'pending' });
    await assertFails(setDoc(doc(as('bob'), 'peerReplies/r4'), reply('bob', { postId: 'p2' })));
  });

  test('moderators can reply as the team and publish replies', async () => {
    await seedPost('p1', { status: 'published' });
    await assertSucceeds(setDoc(doc(as('mod'), 'peerReplies/r1'), reply('mod', { status: 'published', fromStaff: true, alias: 'Wellbeing team' })));
    await assertSucceeds(setDoc(doc(as('bob'), 'peerReplies/r2'), reply('bob')));
    await assertFails(getDoc(doc(as('carol'), 'peerReplies/r2')));
    await assertSucceeds(updateDoc(doc(as('mod'), 'peerReplies/r2'), { status: 'published', moderatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(as('carol'), 'peerReplies/r2')));
    await assertFails(updateDoc(doc(as('bob'), 'peerReplies/r2'), { text: 'changed' }));
  });
});

describe('anonymous notes', () => {
  async function createNote(uid, noteId) {
    const db = as(uid);
    const batch = writeBatch(db);
    batch.set(doc(db, 'anonNotes', noteId), {
      authorId: uid,
      topic: 'bullying',
      status: 'open',
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    });
    batch.set(doc(db, 'anonNotes', noteId, 'messages', 'm1'), { from: 'author', text: 'Someone keeps posting about me.', createdAt: serverTimestamp() });
    return batch.commit();
  }

  test('a young person can start a note; nobody else but a helper can read it', async () => {
    await assertSucceeds(createNote('alice', 'n1'));
    await assertFails(getDoc(doc(as('bob'), 'anonNotes/n1')));
    await assertFails(getDocs(collection(as('bob'), 'anonNotes/n1/messages')));
    await assertFails(getDoc(doc(as('mod'), 'anonNotes/n1')));
    await assertSucceeds(getDoc(doc(as('helper'), 'anonNotes/n1')));
    await assertSucceeds(getDocs(collection(as('helper'), 'anonNotes/n1/messages')));
    await assertFails(getDocs(collection(as('bob'), 'anonNotes')));
  });

  test('helpers reply as helpers; nobody can pretend to be one', async () => {
    await createNote('alice', 'n1');
    const helper = as('helper');
    const batch = writeBatch(helper);
    batch.set(doc(helper, 'anonNotes/n1/messages/m2'), { from: 'helper', text: 'Thank you for telling us.', createdAt: serverTimestamp() });
    batch.update(doc(helper, 'anonNotes/n1'), { status: 'answered', lastMessageAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
    await assertFails(setDoc(doc(as('alice'), 'anonNotes/n1/messages/m3'), { from: 'helper', text: 'fake', createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'anonNotes/n1/messages/m4'), { from: 'author', text: 'intrude', createdAt: serverTimestamp() }));
  });

  test('the author can delete the whole conversation', async () => {
    await createNote('alice', 'n1');
    const alice = as('alice');
    const batch = writeBatch(alice);
    batch.delete(doc(alice, 'anonNotes/n1/messages/m1'));
    batch.delete(doc(alice, 'anonNotes/n1'));
    await assertSucceeds(batch.commit());
  });

  test('notes cannot be created for someone else', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'anonNotes/n9'), { authorId: 'bob', topic: 'other', status: 'open', createdAt: serverTimestamp(), lastMessageAt: serverTimestamp() }));
  });
});

describe('staff, events and everything else', () => {
  test('nobody can make themselves staff', async () => {
    await assertFails(setDoc(doc(as('alice'), 'staff/alice'), { roles: { moderator: true } }));
    await assertSucceeds(getDoc(doc(as('mod'), 'staff/mod')));
    await assertFails(getDoc(doc(as('alice'), 'staff/mod')));
  });

  test('events are public to read and only organisers or moderators can post', async () => {
    const event = (uid) => ({
      title: 'Board game afternoon',
      description: 'All welcome',
      category: 'social',
      startsAt: Timestamp.fromMillis(Date.now() + 86400000),
      location: 'Library',
      link: '',
      createdAt: serverTimestamp(),
      createdBy: uid,
    });
    await assertSucceeds(setDoc(doc(as('org'), 'events/e1'), event('org')));
    await assertFails(setDoc(doc(as('alice'), 'events/e2'), event('alice')));
    await assertSucceeds(getDoc(doc(anon(), 'events/e1')));
    await assertFails(deleteDoc(doc(as('alice'), 'events/e1')));
    await assertSucceeds(deleteDoc(doc(as('mod'), 'events/e1')));
  });

  test('there is nowhere to store personal wellbeing data', async () => {
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { mood: 2 }));
    await assertFails(setDoc(doc(as('alice'), 'moods/m1'), { score: 2 }));
    await assertFails(getDocs(collection(as('mod'), 'users')));
  });
});
