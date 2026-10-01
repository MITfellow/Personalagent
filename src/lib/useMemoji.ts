import { useMemo } from 'react';
import { useStore } from './context';
import { MEMOJI_BY_ID, type MemojiSpec } from './memoji';

/**
 * Resolve an avatar ref to a character, reading custom ones straight from the
 * store. The module registry in `memoji.ts` mirrors the same data for code
 * outside the tree, but a plain module read is invisible to React: saving a new
 * character has to re-render the avatars wearing it, so components use this.
 */
export function useMemojiSpec(avatar?: string): MemojiSpec | undefined {
  const { state } = useStore();
  const mine = state.customMemoji;
  return useMemo(() => {
    if (!avatar?.startsWith('memoji:')) return undefined;
    const id = avatar.slice('memoji:'.length);
    return mine?.find((m) => m.id === id) ?? MEMOJI_BY_ID.get(id);
  }, [avatar, mine]);
}
