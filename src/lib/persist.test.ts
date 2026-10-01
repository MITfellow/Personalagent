import { beforeEach, describe, expect, it } from 'vitest';
import { clearState, loadState, saveState, STORAGE_KEY } from './persist';
import { buildDemoStore } from '../test/demo-world';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('starts a fresh install empty, with the contact directory intact', () => {
    const s = loadState();
    expect(s.chats).toEqual([]);
    expect(s.messages).toEqual([]);
    expect(s.activeChatId).toBeNull();
    expect(Object.keys(s.contacts).length).toBeGreaterThan(0);
  });

  it('round-trips a store', () => {
    const seed = buildDemoStore();
    seed.chats[0].draft = 'hello there';
    expect(saveState(seed).ok).toBe(true);
    expect(loadState().chats[0].draft).toBe('hello there');
  });

  it('never restores a stuck typing indicator', () => {
    const seed = buildDemoStore();
    seed.chats[0].typing = true;
    saveState(seed);
    expect(loadState().chats[0].typing).toBe(false);
  });

  it('resolves messages left mid-send', () => {
    const seed = buildDemoStore();
    seed.messages[0].status = 'sending';
    saveState(seed);
    expect(loadState().messages[0].status).toBe('sent');
  });

  it('migrates a bare v2 payload stored under the old key', () => {
    const seed = buildDemoStore();
    localStorage.setItem('imessage-clone-v2', JSON.stringify(seed));
    const loaded = loadState();
    expect(loaded.chats.length).toBe(seed.chats.length);
    expect(loaded.settings.notifications).toBe(false); // filled in by the migration
  });

  it('ignores corrupt json', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const s = loadState();
    expect(s.chats).toEqual([]);
    expect(Object.keys(s.contacts).length).toBeGreaterThan(0);
  });

  it('ignores a structurally wrong payload', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, state: { nope: true } }));
    const s = loadState();
    expect(s.chats).toEqual([]);
    expect(Object.keys(s.contacts).length).toBeGreaterThan(0);
  });

  it('clears every known key', () => {
    saveState(buildDemoStore());
    localStorage.setItem('imessage-clone-v2', '{}');
    clearState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('imessage-clone-v2')).toBeNull();
  });
});
