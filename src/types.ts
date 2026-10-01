import type { MemojiSpec } from './lib/memoji';
export type Tapback = 'heart' | 'like' | 'dislike' | 'haha' | 'emphasize' | 'question';

export const TAPBACKS: { id: Tapback; glyph: string; label: string }[] = [
  { id: 'heart', glyph: '❤️', label: 'Love' },
  { id: 'like', glyph: '👍', label: 'Like' },
  { id: 'dislike', glyph: '👎', label: 'Dislike' },
  { id: 'haha', glyph: '😂', label: 'Laugh' },
  { id: 'emphasize', glyph: '‼️', label: 'Emphasize' },
  { id: 'question', glyph: '❓', label: 'Question' },
];

export type BubbleEffect = 'none' | 'slam' | 'loud' | 'gentle' | 'invisible';
export type ScreenEffect =
  | 'none'
  | 'echo'
  | 'spotlight'
  | 'balloons'
  | 'confetti'
  | 'love'
  | 'lasers'
  | 'fireworks'
  | 'celebration';

export const BUBBLE_EFFECTS: { id: BubbleEffect; label: string }[] = [
  { id: 'slam', label: 'Slam' },
  { id: 'loud', label: 'Loud' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'invisible', label: 'Invisible Ink' },
];

export const SCREEN_EFFECTS: { id: ScreenEffect; label: string }[] = [
  { id: 'echo', label: 'Echo' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'balloons', label: 'Balloons' },
  { id: 'confetti', label: 'Confetti' },
  { id: 'love', label: 'Love' },
  { id: 'lasers', label: 'Lasers' },
  { id: 'fireworks', label: 'Fireworks' },
  { id: 'celebration', label: 'Celebration' },
];

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Attachment {
  id: string;
  kind: 'image' | 'audio' | 'link' | 'location' | 'file' | 'sticker';
  /** data-uri, remote url, or generated gradient descriptor */
  src?: string;
  name?: string;
  size?: string;
  width?: number;
  height?: number;
  /** audio */
  duration?: number;
  waveform?: number[];
  /** audio: the recording's container, e.g. audio/webm;codecs=opus */
  mimeType?: string;
  /** location: a real reading from the device */
  lat?: number;
  lon?: number;
  accuracy?: number;
  /** link preview */
  title?: string;
  domain?: string;
  description?: string;
}

export interface Reaction {
  type: Tapback;
  by: string; // contact id or 'me'
  at: number;
}

export interface Message {
  id: string;
  chatId: string;
  /** 'me' for outgoing */
  authorId: string;
  text: string;
  subject?: string;
  at: number;
  status: DeliveryStatus;
  readAt?: number;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo?: string;
  bubbleEffect: BubbleEffect;
  screenEffect: ScreenEffect;
  /** invisible ink revealed locally */
  revealed?: boolean;
  edited?: boolean;
  unsent?: boolean;
  /** system notices: "Name named the conversation ..." */
  system?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  handle: string; // phone or email
  initials: string;
  color: [string, string];
  avatar?: string;
  /** persona drives the auto-reply engine */
  persona: 'friend' | 'family' | 'work' | 'partner' | 'business' | 'group';
  sms?: boolean;
  bio?: string;
}

export interface Chat {
  id: string;
  participantIds: string[];
  name?: string; // group name
  pinned: boolean;
  muted: boolean;
  unread: number;
  draft: string;
  typing: boolean;
  typingBy?: string;
  sms: boolean;
  hidePreview?: boolean;
  lastReadAt: number;
}

export interface Store {
  contacts: Record<string, Contact>;
  chats: Chat[];
  messages: Message[];
  activeChatId: string | null;
  me: { name: string; handle: string; avatar?: string };
  /** characters you built in the Memoji studio */
  customMemoji?: MemojiSpec[];
  settings: {
    theme: 'light' | 'dark' | 'system';
    sounds: boolean;
    readReceipts: boolean;
    autoReply: boolean;
    sendWithSound: boolean;
    showDetails: boolean;
    density: 'comfortable' | 'compact';
    notifications: boolean;
  };
}
