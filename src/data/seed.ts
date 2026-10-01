import type { Store, Contact } from '../types';



export const CONTACTS: Contact[] = [
  {
    id: 'maya',
    name: 'Maya Fernandez',
    handle: '+1 (415) 555‑0132',
    initials: 'MF',
    color: ['#FF7A9A', '#FF4F7B'],
    persona: 'partner',
    bio: 'Design lead · San Francisco',
  },
  {
    id: 'dev',
    name: 'Dev Sharma',
    handle: '+91 98100 55512',
    initials: 'DS',
    color: ['#6EC1FF', '#2B7CFF'],
    persona: 'friend',
    bio: 'Climbs rocks, writes Rust',
  },
  {
    id: 'mom',
    name: 'Mom',
    handle: '+1 (415) 555‑0188',
    initials: 'M',
    color: ['#FFC06E', '#FF8A3D'],
    persona: 'family',
    bio: 'Favorite',
  },
  {
    id: 'arjun',
    name: 'Arjun Mehta',
    handle: 'arjun@northlight.co',
    initials: 'AM',
    color: ['#9A8BFF', '#6C4DFF'],
    persona: 'work',
    bio: 'Eng manager · Northlight',
  },
  {
    id: 'priya',
    name: 'Priya Nair',
    handle: '+91 99200 41188',
    initials: 'PN',
    color: ['#6FE7C4', '#1FBF95'],
    persona: 'friend',
    bio: 'Ceramics + espresso',
  },
  {
    id: 'lina',
    name: 'Lina Park',
    handle: 'lina.park@studioatlas.com',
    initials: 'LP',
    color: ['#FFAFC9', '#E86AA0'],
    persona: 'work',
    bio: 'Studio Atlas',
  },
  {
    id: 'sms1',
    name: '+1 (888) 555‑7701',
    handle: '+1 (888) 555‑7701',
    initials: '#',
    color: ['#B6BEC9', '#8B95A1'],
    persona: 'business',
    sms: true,
  },
  {
    id: 'theo',
    name: 'Theo Walsh',
    handle: '+1 (628) 555‑0107',
    initials: 'TW',
    color: ['#FFD36E', '#F2A33C'],
    persona: 'friend',
    bio: 'Plays bass badly',
  },
];

export const DEFAULT_SETTINGS: Store['settings'] = {
  theme: 'system',
  sounds: true,
  readReceipts: true,
  autoReply: true,
  sendWithSound: true,
  showDetails: false,
  density: 'comfortable',
  notifications: false,
};

export const ME = { name: 'You', handle: '+1 (415) 555‑0101' };

/**
 * A brand-new install: the contact directory is available so New Message has
 * someone to write to, but there is no conversation history of any kind.
 */
export function buildSeedStore(): Store {
  const contacts: Record<string, Contact> = {};
  for (const c of CONTACTS) contacts[c.id] = c;
  return {
    contacts,
    chats: [],
    messages: [],
    activeChatId: null,
    me: { ...ME },
    settings: { ...DEFAULT_SETTINGS },
  };
}
