/** Data shapes for the optional cloud features. No names, no contact details, no tracking data. */

export type PostStatus = 'pending' | 'published' | 'hidden';
export type ReactionType = 'hear' | 'strength' | 'metoo';

export type PeerPost = {
  id: string;
  authorId: string;
  alias: string;
  topic: string;
  text: string;
  status: PostStatus;
  createdAt: number;
  reactions: Record<ReactionType, number>;
  reportCount: number;
  replyCount: number;
};

export type PeerReply = {
  id: string;
  postId: string;
  authorId: string;
  alias: string;
  text: string;
  status: PostStatus;
  createdAt: number;
  /** Replies written by the wellbeing team are marked so people know they're from staff. */
  fromStaff: boolean;
};

export type NoteStatus = 'open' | 'answered' | 'closed';

export type AnonNote = {
  id: string;
  authorId: string;
  topic: string;
  status: NoteStatus;
  createdAt: number;
  lastMessageAt: number;
};

export type NoteMessage = {
  id: string;
  noteId: string;
  from: 'author' | 'helper';
  text: string;
  createdAt: number;
};

export type CommunityEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  startsAt: number;
  location: string;
  link?: string;
  createdAt: number;
};

export type StaffRoles = { moderator: boolean; helper: boolean; organiser: boolean };

export type CommunityMode = 'cloud' | 'demo' | 'unavailable';

export interface CommunityService {
  readonly mode: CommunityMode;
  /** Anonymous sign-in. Only called after the user has given consent. */
  ensureSignedIn(): Promise<string>;
  currentUserId(): string | null;
  signOut(): Promise<void>;

  listPosts(): Promise<PeerPost[]>;
  listMyPosts(): Promise<PeerPost[]>;
  getPost(id: string): Promise<PeerPost | null>;
  createPost(input: { topic: string; text: string; alias: string }): Promise<PeerPost>;
  deletePost(id: string): Promise<void>;
  react(postId: string, type: ReactionType): Promise<void>;
  report(postId: string, reason: string): Promise<void>;
  listReplies(postId: string): Promise<PeerReply[]>;
  createReply(postId: string, input: { text: string; alias: string }): Promise<PeerReply>;

  listEvents(): Promise<CommunityEvent[]>;

  listMyNotes(): Promise<AnonNote[]>;
  createNote(input: { topic: string; text: string }): Promise<AnonNote>;
  listNoteMessages(noteId: string): Promise<NoteMessage[]>;
  sendNoteMessage(noteId: string, text: string): Promise<void>;
  closeNote(noteId: string): Promise<void>;

  getStaffRoles(): Promise<StaffRoles>;
  listPendingPosts(): Promise<PeerPost[]>;
  listReportedPosts(): Promise<PeerPost[]>;
  listPendingReplies(): Promise<PeerReply[]>;
  moderatePost(id: string, status: PostStatus): Promise<void>;
  moderateReply(id: string, status: PostStatus): Promise<void>;
  listHelperNotes(): Promise<AnonNote[]>;
  helperReply(noteId: string, text: string): Promise<void>;
  createEvent(input: Omit<CommunityEvent, 'id' | 'createdAt'>): Promise<void>;
  deleteEvent(id: string): Promise<void>;

  /** Deletes everything this anonymous account created, then the account itself. */
  deleteMyCloudData(localHints: { reactedPostIds: string[]; reportedPostIds: string[] }): Promise<void>;
}

export class CommunityError extends Error {
  constructor(
    public readonly code: 'offline' | 'permission' | 'not-configured' | 'validation' | 'unknown',
    message: string,
  ) {
    super(message);
    this.name = 'CommunityError';
  }
}
