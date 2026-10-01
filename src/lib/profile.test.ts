import { describe, expect, it } from 'vitest';
import { reducer } from './reducer';
import { buildDemoStore } from '../test/demo-world';
import { blankMemoji, memojiRef } from './memoji';

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

describe('custom memoji actions', () => {
  it('saves a new character and edits it in place', () => {
    const s0 = buildDemoStore();
    const spec = { ...blankMemoji(), id: 'my-1', name: 'Riya' };
    const s1 = reducer(s0, { type: 'save-memoji', spec });
    expect(s1.customMemoji).toEqual([spec]);

    const edited = { ...spec, name: 'Riya S' };
    const s2 = reducer(s1, { type: 'save-memoji', spec: edited });
    expect(s2.customMemoji).toHaveLength(1); // edit, not a duplicate
    expect(s2.customMemoji?.[0].name).toBe('Riya S');
  });

  it('deleting a character takes it off everyone wearing it', () => {
    const s0 = buildDemoStore();
    const spec = { ...blankMemoji(), id: 'my-2' };
    const id = Object.keys(s0.contacts)[0];
    let s = reducer(s0, { type: 'save-memoji', spec });
    s = reducer(s, { type: 'update-contact', id, patch: { avatar: memojiRef('my-2') } });
    s = reducer(s, { type: 'me', patch: { avatar: memojiRef('my-2') } });

    const after = reducer(s, { type: 'delete-memoji', id: 'my-2' });
    expect(after.customMemoji).toEqual([]);
    expect(after.contacts[id].avatar).toBeUndefined();
    expect(after.me.avatar).toBeUndefined();
  });

  it('leaves other people alone when deleting', () => {
    const s0 = buildDemoStore();
    const [a, b] = Object.keys(s0.contacts);
    let s = reducer(s0, { type: 'save-memoji', spec: { ...blankMemoji(), id: 'my-3' } });
    s = reducer(s, { type: 'update-contact', id: a, patch: { avatar: memojiRef('my-3') } });
    s = reducer(s, { type: 'update-contact', id: b, patch: { avatar: memojiRef('zoe') } });

    const after = reducer(s, { type: 'delete-memoji', id: 'my-3' });
    expect(after.contacts[a].avatar).toBeUndefined();
    expect(after.contacts[b].avatar).toBe('memoji:zoe');
  });

  it('ignores a delete for a character that is not there', () => {
    const s0 = buildDemoStore();
    expect(reducer(s0, { type: 'delete-memoji', id: 'my-nope' })).toBe(s0);
  });
});
