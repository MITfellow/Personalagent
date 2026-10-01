import { describe, expect, it } from 'vitest';
import { reducer } from './reducer';
import { buildDemoStore } from '../test/demo-world';
import type { Message, Store } from '../types';

const base = (): Store => buildDemoStore();

const msg = (over: Partial<Message> = {}): Message => ({
  id: 'm-test',
  chatId: 'c-maya',
  authorId: 'me',
  text: 'hello',
  at: Date.now(),
  status: 'sending',
  attachments: [],
  reactions: [],
  bubbleEffect: 'none',
  screenEffect: 'none',
  ...over,
});

describe('reducer', () => {
  it('selecting a chat clears its unread count', () => {
    let s = base();
    s = reducer(s, { type: 'chat-flag', chatId: 'c-maya', patch: { unread: 7 } });
    s = reducer(s, { type: 'select', chatId: 'c-maya' });
    expect(s.chats.find((c) => c.id === 'c-maya')!.unread).toBe(0);
    expect(s.activeChatId).toBe('c-maya');
  });

  it('an incoming message to an inactive chat increments unread', () => {
    let s = reducer(base(), { type: 'select', chatId: 'c-maya' });
    const other = s.chats.find((c) => c.id !== 'c-maya')!;
    const before = other.unread;
    s = reducer(s, { type: 'push', message: msg({ chatId: other.id, authorId: 'someone' }) });
    expect(s.chats.find((c) => c.id === other.id)!.unread).toBe(before + 1);
  });

  it('an incoming message to the open chat does not increment unread', () => {
    let s = reducer(base(), { type: 'select', chatId: 'c-maya' });
    s = reducer(s, { type: 'push', message: msg({ authorId: 'someone' }) });
    expect(s.chats.find((c) => c.id === 'c-maya')!.unread).toBe(0);
  });

  it('my own message never counts as unread', () => {
    let s = base();
    s = reducer(s, { type: 'push', message: msg({ chatId: 'c-maya' }) });
    expect(s.chats.find((c) => c.id === 'c-maya')!.unread).toBe(0);
  });

  it('status transitions carry a read timestamp', () => {
    let s = reducer(base(), { type: 'push', message: msg() });
    s = reducer(s, { type: 'status', id: 'm-test', status: 'read', readAt: 123 });
    const m = s.messages.find((x) => x.id === 'm-test')!;
    expect(m.status).toBe('read');
    expect(m.readAt).toBe(123);
  });

  it('a tapback toggles off when the same one is sent twice', () => {
    let s = reducer(base(), { type: 'push', message: msg() });
    s = reducer(s, { type: 'react', messageId: 'm-test', tapback: 'heart', by: 'me' });
    expect(s.messages.find((m) => m.id === 'm-test')!.reactions).toHaveLength(1);
    s = reducer(s, { type: 'react', messageId: 'm-test', tapback: 'heart', by: 'me' });
    expect(s.messages.find((m) => m.id === 'm-test')!.reactions).toHaveLength(0);
  });

  it('a tapback replaces a different one from the same person', () => {
    let s = reducer(base(), { type: 'push', message: msg() });
    s = reducer(s, { type: 'react', messageId: 'm-test', tapback: 'heart', by: 'me' });
    s = reducer(s, { type: 'react', messageId: 'm-test', tapback: 'haha', by: 'me' });
    const r = s.messages.find((m) => m.id === 'm-test')!.reactions;
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('haha');
  });

  it('two people can react separately', () => {
    let s = reducer(base(), { type: 'push', message: msg() });
    s = reducer(s, { type: 'react', messageId: 'm-test', tapback: 'heart', by: 'me' });
    s = reducer(s, { type: 'react', messageId: 'm-test', tapback: 'heart', by: 'c-maya' });
    expect(s.messages.find((m) => m.id === 'm-test')!.reactions).toHaveLength(2);
  });

  it('unsending empties the bubble but keeps it in place', () => {
    let s = reducer(base(), { type: 'push', message: msg({ text: 'oops' }) });
    s = reducer(s, { type: 'unsend', id: 'm-test' });
    const m = s.messages.find((x) => x.id === 'm-test')!;
    expect(m.unsent).toBe(true);
    expect(m.text).toBe('');
  });

  it('editing marks the message as edited', () => {
    let s = reducer(base(), { type: 'push', message: msg() });
    s = reducer(s, { type: 'edit', id: 'm-test', text: 'fixed' });
    const m = s.messages.find((x) => x.id === 'm-test')!;
    expect(m.text).toBe('fixed');
    expect(m.edited).toBe(true);
  });

  it('deleting a chat removes its messages and deselects it', () => {
    let s = reducer(base(), { type: 'select', chatId: 'c-maya' });
    s = reducer(s, { type: 'delete-chat', chatId: 'c-maya' });
    expect(s.chats.some((c) => c.id === 'c-maya')).toBe(false);
    expect(s.messages.some((m) => m.chatId === 'c-maya')).toBe(false);
    expect(s.activeChatId).toBeNull();
  });

  it('drafts are stored per chat', () => {
    const s = reducer(base(), { type: 'draft', chatId: 'c-maya', value: 'wip' });
    expect(s.chats.find((c) => c.id === 'c-maya')!.draft).toBe('wip');
  });

  it('settings patches merge instead of replacing', () => {
    const s = reducer(base(), { type: 'settings', patch: { theme: 'dark' } });
    expect(s.settings.theme).toBe('dark');
    expect(s.settings.sounds).toBe(true);
  });

  it('is immutable — the previous state is untouched', () => {
    const before = base();
    const snapshot = JSON.stringify(before);
    reducer(before, { type: 'push', message: msg() });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
