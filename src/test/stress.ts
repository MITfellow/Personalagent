/**
 * Test-only: a deliberately punishing store — many chats, thousands of
 * messages — used to measure render and input latency. Never imported by src/.
 */
import type { Chat, Contact, Message, Store } from '../types';
import { CONTACTS, DEFAULT_SETTINGS, ME } from '../data/seed';

const WORDS =
  'dinner tonight the light was unreal can you grab milk on the way home I will be late sorry hahaha okay sounds good see you then what time is the table booked for let me check and get back to you'.split(
    ' ',
  );

/** deterministic text so runs are comparable */
function line(seed: number): string {
  let s = seed;
  const n = 4 + (seed % 14);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(WORDS[s % WORDS.length]);
  }
  return out.join(' ');
}

export function buildStressStore(chatCount = 40, perChat = 150): Store {
  const contacts: Record<string, Contact> = {};
  for (const c of CONTACTS) contacts[c.id] = c;
  const people = Object.keys(contacts);

  const chats: Chat[] = [];
  const messages: Message[] = [];
  const now = Date.now();
  let t = now - chatCount * perChat * 45_000;

  for (let i = 0; i < chatCount; i++) {
    const id = `s-${i}`;
    const who = people[i % people.length];
    const group = i % 7 === 0;
    chats.push({
      id,
      participantIds: group ? [who, people[(i + 1) % people.length], people[(i + 2) % people.length]] : [who],
      name: group ? `Group ${i}` : undefined,
      pinned: i < 6,
      muted: false,
      unread: i % 5 === 0 ? 2 : 0,
      draft: '',
      typing: false,
      sms: false,
      lastReadAt: now,
    });

    for (let j = 0; j < perChat; j++) {
      const mine = (i + j) % 3 === 0;
      t += 45_000;
      messages.push({
        id: `${id}-m${j}`,
        chatId: id,
        authorId: mine ? 'me' : who,
        text: line(i * 1000 + j),
        at: t,
        status: mine ? 'read' : 'read',
        attachments: [],
        reactions: (i + j) % 11 === 0 ? [{ type: 'heart' as const, by: 'me', at: t }] : [],
        bubbleEffect: 'none',
        screenEffect: 'none',
      });
    }
  }

  return {
    contacts,
    chats,
    messages,
    activeChatId: 's-0',
    me: { ...ME },
    settings: { ...DEFAULT_SETTINGS },
  };
}
