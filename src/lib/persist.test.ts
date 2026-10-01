import { beforeEach, describe, expect, it } from 'vitest';
import { clearState, loadState, saveState, saveToLocal, STORAGE_KEY } from './persist';
import { idbGet, resetDbForTests } from './db';
import { buildDemoStore } from '../test/demo-world';

beforeEach(async () => {
  localStorage.clear();
  resetDbForTests();
  await clearState();
});

describe('persistence', () => {
  it('starts a fresh install empty, with the contact directory intact', async () => {
    const s = await loadState();
    expect(s.chats).toEqual([]);
    expect(s.messages).toEqual([]);
    expect(s.activeChatId).toBeNull();
    expect(Object.keys(s.contacts).length).toBeGreaterThan(0);
  });

  it('round-trips a store', async () => {
    const seed = buildDemoStore();
    seed.chats[0].draft = 'hello there';
    expect((await saveState(seed)).ok).toBe(true);
    expect((await loadState()).chats[0].draft).toBe('hello there');
  });

  it('never restores a stuck typing indicator', async () => {
    const seed = buildDemoStore();
    seed.chats[0].typing = true;
    await saveState(seed);
    expect((await loadState()).chats[0].typing).toBe(false);
  });

  it('resolves messages left mid-send', async () => {
    const seed = buildDemoStore();
    seed.messages[0].status = 'sending';
    await saveState(seed);
    expect((await loadState()).messages[0].status).toBe('sent');
  });

  it('survives corrupt storage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const s = await loadState();
    expect(s.chats).toEqual([]);
  });

  it('clears everything', async () => {
    await saveState(buildDemoStore());
    await clearState();
    expect((await loadState()).chats).toEqual([]);
  });
});

describe('IndexedDB is the home of record', () => {
  it('writes to the database, not localStorage', async () => {
    await saveState(buildDemoStore());
    expect(await idbGet(STATE_KEY_FOR_TEST)).toBeTruthy();
    // the legacy copy is cleared so it cannot shadow the database
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('migrates a localStorage account into the database on first load', async () => {
    const legacy = buildDemoStore();
    legacy.chats[0].draft = 'written before the migration';
    saveToLocal(legacy, Date.now());
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

    const loaded = await loadState();
    expect(loaded.chats[0].draft).toBe('written before the migration');

    // and it is now in the database, so the next load does not need the copy
    await new Promise((r) => setTimeout(r, 10));
    const env = (await idbGet(STATE_KEY_FOR_TEST)) as { state: { chats: { draft: string }[] } };
    expect(env.state.chats[0].draft).toBe('written before the migration');
  });

  it('prefers whichever copy is newer', async () => {
    const older = buildDemoStore();
    older.chats[0].draft = 'older, in the database';
    await saveState(older);

    const newer = buildDemoStore();
    newer.chats[0].draft = 'newer, in localStorage';
    saveToLocal(newer, Date.now() + 5_000);

    expect((await loadState()).chats[0].draft).toBe('newer, in localStorage');
  });

  it('keeps the database copy when it is the newer one', async () => {
    const stale = buildDemoStore();
    stale.chats[0].draft = 'stale localStorage';
    saveToLocal(stale, Date.now() - 60_000);

    const fresh = buildDemoStore();
    fresh.chats[0].draft = 'fresh database';
    await saveState(fresh);

    expect((await loadState()).chats[0].draft).toBe('fresh database');
  });

  it('stores a payload far beyond the localStorage ceiling', async () => {
    const big = buildDemoStore();
    // ~12MB of attachment data: localStorage would throw well before this
    const blob = 'data:image/png;base64,' + 'A'.repeat(1_500_000);
    for (let i = 0; i < 8; i++) {
      big.messages.push({
        ...big.messages[0],
        id: `big-${i}`,
        attachments: [{ id: `a-${i}`, kind: 'image', src: blob }],
      });
    }
    const res = await saveState(big);
    expect(res.ok).toBe(true);

    const back = await loadState();
    const kept = back.messages.filter((m) => m.id.startsWith('big-'));
    expect(kept).toHaveLength(8);
    // every photo survived — nothing was "freed to save space"
    for (const m of kept) expect(m.attachments[0].src).toHaveLength(blob.length);
  });
});

describe('concurrent writes', () => {
  it('leaves the newest snapshot on disk when saves overlap', async () => {
    const first = buildDemoStore();
    first.chats[0].draft = 'first';
    const second = buildDemoStore();
    second.chats[0].draft = 'second';

    // both in flight at once: the older must never land on top of the newer
    const a = saveState(first);
    const b = saveState(second);
    await Promise.all([a, b]);

    expect((await loadState()).chats[0].draft).toBe('second');
  });

  it('does not let the migration write clobber a later save', async () => {
    const legacy = buildDemoStore();
    legacy.chats[0].draft = 'legacy';
    saveToLocal(legacy, Date.now());

    // loadState migrates in the background while the app saves new work
    const loading = loadState();
    const fresh = buildDemoStore();
    fresh.chats[0].draft = 'sent after boot';
    await loading;
    await saveState(fresh);
    await new Promise((r) => setTimeout(r, 20));

    expect((await loadState()).chats[0].draft).toBe('sent after boot');
  });
});

const STATE_KEY_FOR_TEST = 'state';
