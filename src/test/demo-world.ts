/**
 * Test-only fixture: the sample world the app used to ship with.
 * Nothing in src/ imports this outside tests, so it never reaches the bundle.
 */
import type { Store, Message, Contact, Chat, Attachment } from '../types';
import { CONTACTS, DEFAULT_SETTINGS, ME } from '../data/seed';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const NOW = Date.now();
const ago = (ms: number) => NOW - ms;

/** deterministic pseudo-waveform */
function wave(seed: number, n = 34): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const envelope = Math.sin((i / n) * Math.PI);
    out.push(Math.max(0.12, Math.min(1, r * 0.85 * envelope + 0.18)));
  }
  return out;
}

export const CHATS: Chat[] = [
  { id: 'c-maya', participantIds: ['maya'], pinned: true, muted: false, unread: 0, draft: '', typing: false, sms: false, lastReadAt: NOW },
  { id: 'c-trip', participantIds: ['maya', 'dev', 'priya', 'theo'], name: 'Weekend Trip 🏔️', pinned: true, muted: false, unread: 2, draft: '', typing: false, sms: false, lastReadAt: ago(3 * HOUR) },
  { id: 'c-dev', participantIds: ['dev'], pinned: true, muted: false, unread: 0, draft: '', typing: false, sms: false, lastReadAt: NOW },
  { id: 'c-mom', participantIds: ['mom'], pinned: true, muted: false, unread: 1, draft: '', typing: false, sms: false, lastReadAt: ago(DAY) },
  { id: 'c-arjun', participantIds: ['arjun'], pinned: true, muted: false, unread: 0, draft: 'Sounds good — I’ll have the ', typing: false, sms: false, lastReadAt: NOW },
  { id: 'c-priya', participantIds: ['priya'], pinned: true, muted: true, unread: 0, draft: '', typing: false, sms: false, lastReadAt: NOW },
  { id: 'c-lina', participantIds: ['lina'], pinned: false, muted: false, unread: 0, draft: '', typing: false, sms: false, lastReadAt: NOW },
  { id: 'c-sms1', participantIds: ['sms1'], pinned: false, muted: false, unread: 0, draft: '', typing: false, sms: true, lastReadAt: NOW },
  { id: 'c-theo', participantIds: ['theo'], pinned: false, muted: false, unread: 0, draft: '', typing: false, sms: false, lastReadAt: NOW },
];

let n = 0;
const mid = () => `m${++n}`;

function m(
  chatId: string,
  authorId: string,
  text: string,
  at: number,
  extra: Partial<Message> = {},
): Message {
  return {
    id: mid(),
    chatId,
    authorId,
    text,
    at,
    status: authorId === 'me' ? 'read' : 'read',
    attachments: [],
    reactions: [],
    bubbleEffect: 'none',
    screenEffect: 'none',
    ...extra,
  };
}

const photo = (src: string, w = 1200, h = 1600): Attachment => ({
  id: `a${Math.random().toString(36).slice(2, 9)}`,
  kind: 'image',
  src,
  width: w,
  height: h,
});

export const MESSAGES: Message[] = [
  // ───────────────────────── Maya
  m('c-maya', 'maya', 'morning ☀️ did you remember the dentist thing at 11?', ago(2 * DAY + 5 * HOUR)),
  m('c-maya', 'me', 'I did NOT. thank you for existing', ago(2 * DAY + 4.9 * HOUR)),
  m('c-maya', 'maya', 'this is why I’m the favorite', ago(2 * DAY + 4.85 * HOUR), {
    reactions: [{ type: 'haha', by: 'me', at: ago(2 * DAY + 4.8 * HOUR) }],
  }),
  m('c-maya', 'maya', 'Look what the light was doing on the walk home', ago(28 * HOUR), {
    attachments: [photo('/photos/golden-hour.jpg', 1200, 1500)],
  }),
  m('c-maya', 'me', 'okay that’s a painting', ago(27.8 * HOUR), {
    reactions: [{ type: 'heart', by: 'maya', at: ago(27.7 * HOUR) }],
  }),
  m('c-maya', 'me', 'Dinner tonight? I can get us the 7:30 at Kiln', ago(5 * HOUR)),
  m('c-maya', 'maya', 'yes please. I’ll be out of my last call by 7', ago(4.6 * HOUR)),
  m('c-maya', 'maya', 'wear the green shirt 👀', ago(4.58 * HOUR)),
  m('c-maya', 'me', 'bold of you to assume it’s clean', ago(4.4 * HOUR), { bubbleEffect: 'gentle' }),
  m('c-maya', 'maya', 'it is. I did laundry. you’re welcome', ago(4.3 * HOUR), {
    reactions: [{ type: 'emphasize', by: 'me', at: ago(4.2 * HOUR) }],
  }),
  m('c-maya', 'me', 'Marrying you was a sound financial decision', ago(42 * MIN), { status: 'read', readAt: ago(40 * MIN) }),

  // ───────────────────────── Weekend Trip group
  m('c-trip', 'theo', 'okay the cabin is booked ✅ 2 nights, sleeps 6', ago(3 * DAY)),
  m('c-trip', 'priya', 'THEO. you absolute legend', ago(3 * DAY - 4 * MIN), {
    reactions: [{ type: 'like', by: 'dev', at: ago(3 * DAY - 3 * MIN) }, { type: 'heart', by: 'maya', at: ago(3 * DAY - 2 * MIN) }],
  }),
  m('c-trip', 'me', 'I’ll drive, I can take 4 + bags', ago(3 * DAY - 10 * MIN)),
  m('c-trip', 'dev', 'putting the trail map here so nobody asks twice', ago(2 * DAY), {
    attachments: [
      {
        id: 'lk1',
        kind: 'link',
        src: 'https://alltrails.example/eagle-ridge-loop',
        title: 'Eagle Ridge Loop — 9.4 mi · Hard',
        domain: 'alltrails.example',
        description: '2,150 ft gain. Best early morning; the last mile is exposed.',
      },
    ],
  }),
  m('c-trip', 'maya', 'nine point four MILES', ago(2 * DAY - 20 * MIN)),
  m('c-trip', 'dev', 'you’ll be fine, there’s a lake at the top', ago(2 * DAY - 25 * MIN)),
  m('c-trip', 'priya', 'bringing: coffee setup, two board games, zero sense of direction', ago(26 * HOUR)),
  m('c-trip', 'theo', 'bringing the speaker and an unreasonable amount of cheese', ago(25 * HOUR), {
    reactions: [{ type: 'like', by: 'priya', at: ago(24 * HOUR) }],
  }),
  m('c-trip', 'me', 'Leaving Friday 4pm sharp. Sharp!!', ago(6 * HOUR), { bubbleEffect: 'loud' }),
  m('c-trip', 'dev', 'he says, having been late to every single thing since 2014', ago(2.4 * HOUR), {
    reactions: [{ type: 'haha', by: 'theo', at: ago(2.3 * HOUR) }, { type: 'haha', by: 'priya', at: ago(2.2 * HOUR) }],
  }),
  m('c-trip', 'priya', 'does anyone have a second sleeping bag I can borrow 🙏', ago(2 * HOUR)),

  // ───────────────────────── Dev
  m('c-dev', 'dev', 'ok the rust rewrite is done and it is 11x faster', ago(4 * DAY)),
  m('c-dev', 'me', 'eleven. x.', ago(4 * DAY - 6 * MIN)),
  m('c-dev', 'dev', 'ELEVEN', ago(4 * DAY - 7 * MIN), { bubbleEffect: 'slam' }),
  m('c-dev', 'me', 'send the benchmark or it didn’t happen', ago(4 * DAY - 10 * MIN)),
  m('c-dev', 'dev', '', ago(4 * DAY - 14 * MIN), {
    attachments: [{ id: 'au1', kind: 'audio', duration: 23, waveform: wave(7) }],
  }),
  m('c-dev', 'me', 'did you just send a 23 second voice note instead of a screenshot', ago(4 * DAY - 16 * MIN), {
    reactions: [{ type: 'haha', by: 'dev', at: ago(4 * DAY - 15 * MIN) }],
  }),
  m('c-dev', 'dev', 'climbing saturday morning? gym opens at 7', ago(9 * HOUR)),
  m('c-dev', 'me', '7 is a hypothetical hour but yes', ago(8.6 * HOUR)),
  m('c-dev', 'dev', '🧗', ago(8.5 * HOUR)),

  // ───────────────────────── Mom
  m('c-mom', 'mom', 'Did you eat?', ago(6 * DAY)),
  m('c-mom', 'me', 'Yes mom', ago(6 * DAY - 30 * MIN)),
  m('c-mom', 'mom', 'What did you eat', ago(6 * DAY - 32 * MIN)),
  m('c-mom', 'me', '…a sandwich', ago(6 * DAY - 40 * MIN)),
  m('c-mom', 'mom', 'That is not dinner. I am sending the dal recipe again.', ago(6 * DAY - 41 * MIN)),
  m('c-mom', 'mom', 'Your father finally figured out the printer. Only took the whole afternoon and two phone calls to your uncle.', ago(30 * HOUR)),
  m('c-mom', 'me', 'A historic day', ago(29 * HOUR), {
    reactions: [{ type: 'haha', by: 'mom', at: ago(28 * HOUR) }],
  }),
  m('c-mom', 'mom', 'Call me when you have a minute, nothing urgent ❤️', ago(90 * MIN)),

  // ───────────────────────── Arjun (work)
  m('c-arjun', 'arjun', 'Hey — roadmap review moved to Thursday 10:00. Does that still work on your end?', ago(2 * DAY)),
  m('c-arjun', 'me', 'Works. I’ll bring the revised scope doc.', ago(2 * DAY - 25 * MIN)),
  m('c-arjun', 'arjun', 'Perfect. Also, legal cleared the vendor contract this morning.', ago(2 * DAY - 40 * MIN)),
  m('c-arjun', 'arjun', 'One more: can you own the migration write-up? Needs to land before the freeze on the 14th.', ago(20 * HOUR)),
  m('c-arjun', 'me', 'Yep, I’ll have a draft by Friday EOD.', ago(19 * HOUR), {
    reactions: [{ type: 'like', by: 'arjun', at: ago(18.9 * HOUR) }],
  }),

  // ───────────────────────── Priya
  m('c-priya', 'priya', 'kiln opens tomorrow, first firing of the new glaze', ago(5 * DAY)),
  m('c-priya', 'priya', '', ago(5 * DAY - 3 * MIN), {
    attachments: [photo('/photos/ceramics.jpg', 1200, 1200)],
  }),
  m('c-priya', 'me', 'that blue is unreal', ago(5 * DAY - 10 * MIN), {
    reactions: [{ type: 'heart', by: 'priya', at: ago(5 * DAY - 9 * MIN) }],
  }),
  m('c-priya', 'priya', 'saving you one of the small bowls', ago(5 * DAY - 12 * MIN)),
  m('c-priya', 'me', 'claiming it formally. in writing. this is a contract', ago(5 * DAY - 15 * MIN)),

  // ───────────────────────── Lina
  m('c-lina', 'lina', 'Hi! Sending over the revised deck tonight — the type is fixed and I swapped the cover image.', ago(8 * DAY)),
  m('c-lina', 'lina', '', ago(8 * DAY - 5 * MIN), {
    attachments: [{ id: 'f1', kind: 'file', name: 'Atlas_Brand_v7.pdf', size: '18.4 MB' }],
  }),
  m('c-lina', 'me', 'Got it, thank you. Page 12 is the one.', ago(8 * DAY - 60 * MIN)),
  m('c-lina', 'lina', 'That’s my favorite too. Let’s ship it.', ago(7 * DAY), {
    reactions: [{ type: 'like', by: 'me', at: ago(7 * DAY) }],
  }),

  // ───────────────────────── SMS
  m('c-sms1', 'sms1', 'Your verification code is 418‑902. It expires in 10 minutes. Do not share this code.', ago(11 * HOUR)),
  m('c-sms1', 'sms1', 'Your package was delivered to the front porch. Track: 1Z‑88213‑AA', ago(3.2 * HOUR)),

  // ───────────────────────── Theo
  m('c-theo', 'theo', 'band practice moved to 8, the drummer has a "work thing"', ago(9 * DAY)),
  m('c-theo', 'me', 'the drummer always has a work thing', ago(9 * DAY - 20 * MIN)),
  m('c-theo', 'theo', 'the drummer is an accountant in april. we knew the risks.', ago(9 * DAY - 25 * MIN), {
    reactions: [{ type: 'haha', by: 'me', at: ago(9 * DAY - 24 * MIN) }],
  }),
];

// Replies / threading
const dinner = MESSAGES.find((x) => x.text.startsWith('Dinner tonight'));
const yesPlease = MESSAGES.find((x) => x.text.startsWith('yes please'));
if (dinner && yesPlease) yesPlease.replyTo = dinner.id;

const sleepingBag = MESSAGES.find((x) => x.text.startsWith('does anyone have a second'));
if (sleepingBag) sleepingBag.chatId = 'c-trip';

export function buildDemoStore(): Store {
  const contacts: Record<string, Contact> = {};
  for (const c of CONTACTS) contacts[c.id] = c;
  return {
    contacts,
    chats: CHATS.map((c) => ({ ...c })),
    messages: MESSAGES.map((x) => ({
      ...x,
      readAt: x.authorId === 'me' && x.status === 'read' ? x.readAt ?? x.at + 92_000 : x.readAt,
    })),
    activeChatId: 'c-maya',
    me: { ...ME },
    settings: { ...DEFAULT_SETTINGS },
  };
}
