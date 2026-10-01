import type { Contact } from '../types';

/** Palette reused for generated avatars, mirroring the built-in directory. */
const PALETTE: Array<[string, string]> = [
  ['#FF7A9A', '#FF4F7B'],
  ['#6FB6FF', '#2D8CFF'],
  ['#A58BFF', '#7A5CFF'],
  ['#5FD4A0', '#28B981'],
  ['#FFB65F', '#FF8A28'],
  ['#FF8F8F', '#FF5A5A'],
  ['#7ED4E6', '#36B6D4'],
  ['#C8A2FF', '#9B6BFF'],
];

export function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '#';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Stable colour for a name, so the same person always looks the same. */
export function colorFor(key: string): [string, string] {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function looksLikePhone(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 7 && /^[+\d\s().-]+$/.test(value.trim());
}

export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** A typed-in recipient is a valid destination if it is a number or an email. */
export function isAddressable(value: string) {
  return looksLikePhone(value) || looksLikeEmail(value);
}

export function makeContact(input: { name?: string; handle: string; persona?: Contact['persona'] }): Contact {
  const handle = input.handle.trim();
  const name = (input.name ?? '').trim() || handle;
  return {
    id: `ct-${Math.random().toString(36).slice(2, 9)}`,
    name,
    handle,
    initials: looksLikePhone(name) ? '#' : initialsFor(name),
    color: colorFor(name + handle),
    // typed-in recipients get the neutral persona; SMS green when it is a number
    persona: input.persona ?? 'friend',
    sms: looksLikePhone(handle) && !looksLikeEmail(handle) ? undefined : undefined,
  };
}
