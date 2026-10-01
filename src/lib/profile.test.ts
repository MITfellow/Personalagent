import { describe, expect, it } from 'vitest';
import { reducer } from './reducer';
import { buildDemoStore } from '../test/demo-world';
import { memojiRef } from './memoji';

describe('avatar actions', () => {
  it('sets and clears a contact memoji', () => {
    const s0 = buildDemoStore();
    const id = Object.keys(s0.contacts)[0];
    const s1 = reducer(s0, { type: 'update-contact', id, patch: { avatar: memojiRef('zoe') } });
    expect(s1.contacts[id].avatar).toBe('memoji:zoe');
    const s2 = reducer(s1, { type: 'update-contact', id, patch: { avatar: undefined } });
    expect(s2.contacts[id].avatar).toBeUndefined();
  });

  it('sets my own memoji without touching the rest of the profile', () => {
    const s0 = buildDemoStore();
    const s1 = reducer(s0, { type: 'me', patch: { avatar: memojiRef('kai') } });
    expect(s1.me.avatar).toBe('memoji:kai');
    expect(s1.me.name).toBe(s0.me.name);
    expect(s1.me.handle).toBe(s0.me.handle);
    expect(s1.contacts).toBe(s0.contacts);
  });
});
