/**
 * Memoji character definitions.
 *
 * Pure data + helpers, kept out of the component file so fast refresh works.
 * Each character is drawn as inline SVG by <Memoji> — no image files, no
 * network — so it renders identically at any size, on any background.
 */

export interface MemojiSpec {
  id: string;
  name: string;
  /** backdrop behind the head, mirroring Apple's coloured tiles */
  bg: [string, string];
  skin: string;
  /** darker tone for the ear/neck shadow */
  shade: string;
  hair?: string;
  /** hair silhouette: how the top of the head is drawn */
  style: 'short' | 'bob' | 'curly' | 'bun' | 'bald' | 'long' | 'cap' | 'alien' | 'robot';
  brows?: boolean;
  glasses?: 'none' | 'round' | 'square';
  facial?: 'none' | 'beard' | 'stubble';
  blush?: boolean;
  earrings?: boolean;
  mouth?: 'smile' | 'grin' | 'soft' | 'oh';
}

export const MEMOJI: MemojiSpec[] = [
  { id: 'ari', name: 'Ari', bg: ['#FFD9A8', '#FFB766'], skin: '#F3C9A2', shade: '#E0AE84', hair: '#4A2E22', style: 'bob', brows: true, mouth: 'smile', blush: true, earrings: true },
  { id: 'milo', name: 'Milo', bg: ['#BFE3FF', '#7FC2FF'], skin: '#8D5A3B', shade: '#74472D', hair: '#1E1512', style: 'curly', brows: true, mouth: 'grin' },
  { id: 'zoe', name: 'Zoe', bg: ['#FFC9DE', '#FF93BA'], skin: '#F6D5BE', shade: '#E4BC9F', hair: '#8B3E2F', style: 'long', brows: true, mouth: 'smile', earrings: true },
  { id: 'kai', name: 'Kai', bg: ['#C9F0DE', '#7FD9B0'], skin: '#5C3A24', shade: '#482C1A', hair: '#140D0A', style: 'short', brows: true, facial: 'beard', mouth: 'soft' },
  { id: 'nova', name: 'Nova', bg: ['#E2D5FF', '#B79BFF'], skin: '#EFCDB4', shade: '#DBB096', hair: '#6D4AC9', style: 'bun', brows: true, glasses: 'round', mouth: 'smile' },
  { id: 'rey', name: 'Rey', bg: ['#FFE6A8', '#FFC75A'], skin: '#C98A5E', shade: '#AE7049', hair: '#20170F', style: 'cap', brows: true, mouth: 'grin' },
  { id: 'sol', name: 'Sol', bg: ['#FFD2C2', '#FF9E86'], skin: '#F0C4A6', shade: '#DBA888', style: 'bald', brows: true, facial: 'stubble', mouth: 'soft' },
  { id: 'iris', name: 'Iris', bg: ['#C7E9FF', '#8ACBFF'], skin: '#6E4530', shade: '#573525', hair: '#2B1A12', style: 'bun', brows: true, glasses: 'square', mouth: 'smile', earrings: true },
  { id: 'theo', name: 'Theo', bg: ['#D9E7FF', '#A8C2FF'], skin: '#F4D3B8', shade: '#E0B99A', hair: '#C98B3B', style: 'short', brows: true, mouth: 'smile' },
  { id: 'luna', name: 'Luna', bg: ['#FFD6F2', '#FF9EDB'], skin: '#E8B894', shade: '#D29E78', hair: '#E8528F', style: 'bob', brows: true, mouth: 'grin', blush: true },
  { id: 'pip', name: 'Pip', bg: ['#D7FFE3', '#8BE9AE'], skin: '#9BE8A0', shade: '#79CC7F', style: 'alien', mouth: 'oh' },
  { id: 'bolt', name: 'Bolt', bg: ['#DCE3EC', '#AEBCCD'], skin: '#D6DEE8', shade: '#B6C2D1', style: 'robot', mouth: 'smile' },
];

export const MEMOJI_BY_ID = new Map(MEMOJI.map((m) => [m.id, m]));

/**
 * Characters you built yourself live in the store, but `<Avatar>` resolves an
 * avatar string from deep inside the tree where threading a prop through every
 * call site would be miserable. The provider mirrors the store into this
 * registry on every change, so `parseMemoji` stays a pure-looking lookup.
 */
let custom: MemojiSpec[] = [];
let customById = new Map<string, MemojiSpec>();

export function setCustomMemoji(specs: MemojiSpec[] | undefined) {
  custom = specs ?? [];
  customById = new Map(custom.map((m) => [m.id, m]));
}

/** Everything the picker should show: yours first, then the stock cast. */
export function allMemoji(specs?: MemojiSpec[]): MemojiSpec[] {
  return [...(specs ?? custom), ...MEMOJI];
}

export const isCustomId = (id: string) => id.startsWith('my-');

/** `memoji:ari` ⇢ the spec, for anything persisted on a contact. */
export function parseMemoji(avatar?: string): MemojiSpec | undefined {
  if (!avatar?.startsWith('memoji:')) return undefined;
  const id = avatar.slice('memoji:'.length);
  return customById.get(id) ?? MEMOJI_BY_ID.get(id);
}

export const memojiRef = (id: string) => `memoji:${id}`;

/** Option palettes the studio offers, kept beside the spec they describe. */
export const SKIN_TONES: Array<[string, string]> = [
  ['#F6D5BE', '#E4BC9F'],
  ['#F3C9A2', '#E0AE84'],
  ['#EFCDB4', '#DBB096'],
  ['#E8B894', '#D29E78'],
  ['#C98A5E', '#AE7049'],
  ['#8D5A3B', '#74472D'],
  ['#6E4530', '#573525'],
  ['#4A2C1B', '#3A2114'],
  ['#9BE8A0', '#79CC7F'],
  ['#D6DEE8', '#B6C2D1'],
];

export const HAIR_COLORS = ['#1E1512', '#4A2E22', '#8B3E2F', '#C98B3B', '#E8E0D4', '#6D4AC9', '#E8528F', '#2F7FD6'];

export const BACKDROPS: Array<[string, string]> = [
  ['#BFE3FF', '#7FC2FF'],
  ['#C9F0DE', '#7FD9B0'],
  ['#FFE6A8', '#FFC75A'],
  ['#FFC9DE', '#FF93BA'],
  ['#E2D5FF', '#B79BFF'],
  ['#FFD2C2', '#FF9E86'],
  ['#D7FFE3', '#8BE9AE'],
  ['#DCE3EC', '#AEBCCD'],
];

export const HAIR_STYLES: Array<{ id: MemojiSpec['style']; label: string }> = [
  { id: 'short', label: 'Short' },
  { id: 'bob', label: 'Bob' },
  { id: 'curly', label: 'Curly' },
  { id: 'bun', label: 'Bun' },
  { id: 'long', label: 'Long' },
  { id: 'cap', label: 'Cap' },
  { id: 'bald', label: 'Bald' },
  { id: 'alien', label: 'Alien' },
  { id: 'robot', label: 'Robot' },
];

/** A fresh character to start editing from. */
export function blankMemoji(): MemojiSpec {
  return {
    id: `my-${Math.random().toString(36).slice(2, 9)}`,
    name: 'My Memoji',
    bg: [...BACKDROPS[0]] as [string, string],
    skin: SKIN_TONES[0][0],
    shade: SKIN_TONES[0][1],
    hair: HAIR_COLORS[1],
    style: 'short',
    brows: true,
    glasses: 'none',
    facial: 'none',
    mouth: 'smile',
  };
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Shuffle every trait at once — the "surprise me" button. */
export function randomMemoji(base: MemojiSpec): MemojiSpec {
  const [skin, shade] = pick(SKIN_TONES);
  const style = pick(HAIR_STYLES).id;
  return {
    ...base,
    bg: [...pick(BACKDROPS)] as [string, string],
    skin,
    shade,
    hair: pick(HAIR_COLORS),
    style,
    brows: true,
    glasses: pick(['none', 'none', 'round', 'square'] as const),
    facial: pick(['none', 'none', 'beard', 'stubble'] as const),
    blush: Math.random() < 0.3,
    earrings: Math.random() < 0.3,
    mouth: pick(['smile', 'grin', 'soft', 'oh'] as const),
  };
}

