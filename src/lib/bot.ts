import type { Contact, Tapback } from '../types';

export interface BotTurn {
  authorId: string;
  text: string;
  delay: number; // ms before typing indicator -> message
  typingFor: number; // ms of visible typing
  tapbackOnYou?: Tapback;
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const maybe = (p: number) => Math.random() < p;

const BY_PERSONA: Record<Contact['persona'], string[]> = {
  partner: [
    'okay that made me smile at my desk',
    'love you. ridiculous, but love you',
    'can we talk about this over dinner',
    'I was literally about to text you the same thing',
    'send a picture, I miss your face',
    'you’re lucky you’re cute',
  ],
  friend: [
    'lol accurate',
    'okay but hear me out',
    'I’m free after 6 if you want to do something',
    'this is the most you message ever sent',
    'bet',
    'no because why is that so true',
  ],
  family: [
    'Okay beta. Did you eat?',
    'Send me a photo when you get a chance ❤️',
    'Your father says hello.',
    'Call me tonight if you can, no rush.',
    'That is good news. I am proud of you.',
  ],
  work: [
    'Got it — thanks for the quick turnaround.',
    'Makes sense. I’ll loop in the rest of the team.',
    'Can you put that in the doc so it doesn’t get lost?',
    'Let’s cover it in the sync tomorrow.',
    'Approved on my end.',
  ],
  business: [
    'Reply STOP to unsubscribe.',
    'Your request has been received. Ref #88‑2213.',
    'Thanks for contacting us. An agent will respond shortly.',
  ],
  group: ['same', 'I’m in', 'wait when', '😂😂'],
};

interface Rule {
  test: RegExp;
  reply: (c: Contact) => string[];
  tapback?: Tapback;
}

const RULES: Rule[] = [
  {
    test: /^(hi|hey|hello|yo|hii+|sup|hola|namaste)\b/i,
    reply: (c) =>
      c.persona === 'work'
        ? ['Hi! What’s up?']
        : c.persona === 'family'
          ? ['Hello! I was just thinking about you.']
          : [pick(['hey you', 'yooo', 'hey! what’s going on'])],
  },
  {
    test: /\b(love you|miss you|ily)\b/i,
    reply: () => [pick(['love you more ❤️', 'miss you too. come home', 'okay now I’m smiling'])],
    tapback: 'heart',
  },
  {
    test: /\b(thanks|thank you|ty|appreciate)\b/i,
    reply: (c) => [c.persona === 'work' ? 'Of course — happy to help.' : pick(['anytime 🙏', 'np!', 'of course'])],
    tapback: 'like',
  },
  {
    test: /\b(sorry|my bad|apologies)\b/i,
    reply: () => [pick(['all good, genuinely', 'don’t even worry about it', 'no apology needed'])],
  },
  {
    test: /\b(lol|lmao|haha|😂|🤣)\b/i,
    reply: () => [pick(['😂😂', 'I knew you’d like that', 'crying'])],
    tapback: 'haha',
  },
  {
    test: /\b(dinner|lunch|food|eat|hungry|coffee|drinks)\b/i,
    reply: (c) =>
      c.persona === 'family'
        ? ['Good. Eat properly, not just a sandwich.']
        : [pick(['I’m so in', 'what time are you thinking?', 'yes. I’ve been thinking about food since 11am'])],
  },
  {
    test: /\b(tomorrow|tonight|today|weekend|friday|saturday|sunday|monday)\b/i,
    reply: () => [pick(['works for me', 'let me check and confirm in a bit', 'yep, put it in the calendar'])],
  },
  {
    test: /\b(call|phone|facetime)\b/i,
    reply: () => [pick(['give me 10 and I’ll call', 'can’t talk right now — text ok?', 'calling you in a sec'])],
  },
  {
    test: /\b(where|when|how|what|why|who|can you|could you|do you|did you|are you|is it)\b.*\??$/i,
    reply: (c) =>
      c.persona === 'work'
        ? [pick(['Let me pull it up and get back to you.', 'Short answer: yes. Longer answer in the doc.'])]
        : [pick(['good question', 'honestly? no idea', 'I was going to ask you the same thing'])],
  },
  {
    test: /\?\s*$/,
    reply: () => [pick(['hmm let me think', 'probably yeah', 'I’d say go for it'])],
  },
  {
    test: /^(ok|okay|k|cool|nice|great|sure|yes|yep|yeah|no|nope)\b/i,
    reply: () => [pick(['👍', 'cool', 'sounds good'])],
    tapback: 'like',
  },
  {
    test: /^(?:\p{Emoji}|\s|\u200d|\ufe0f)+$/u,
    reply: () => [pick(['😂', '🙌', 'exactly'])],
  },
  {
    test: /\b(tired|exhausted|stressed|rough|hard day|annoyed)\b/i,
    reply: () => [pick(['oof. that sounds like a lot', 'you okay? want to talk about it', 'take the night off, seriously'])],
    tapback: 'heart',
  },
  {
    test: /\b(congrats|got the job|promoted|shipped|launched|passed)\b/i,
    reply: () => [pick(['WAIT. congratulations!! 🎉', 'this is huge, I’m so proud of you'])],
    tapback: 'emphasize',
  },
];

function typingTime(text: string) {
  return Math.min(4200, Math.max(900, text.length * 42 + Math.random() * 500));
}

export function composeReply(contact: Contact, userText: string, isGroup: boolean): BotTurn[] {
  const text = userText.trim();
  let bodies: string[] | null = null;
  let tapback: Tapback | undefined;

  for (const r of RULES) {
    if (r.test.test(text)) {
      bodies = r.reply(contact);
      tapback = r.tapback;
      break;
    }
  }
  if (!bodies) bodies = [pick(BY_PERSONA[contact.persona])];

  // occasionally follow up with a second message
  if (maybe(isGroup ? 0.3 : 0.35) && contact.persona !== 'business') {
    bodies = [
      ...bodies,
      pick(
        contact.persona === 'work'
          ? ['Also — don’t forget the Thursday review.', 'One more thing: I updated the doc.']
          : contact.persona === 'family'
            ? ['Anyway. Drink water.', 'Okay I’ll let you go. ❤️']
            : ['also random but I keep thinking about that thing you said', 'anyway. unrelated: are you free sunday'],
      ),
    ];
  }

  let t = 500 + Math.random() * 900;
  return bodies.map((body, i) => {
    const typingFor = typingTime(body);
    const turn: BotTurn = {
      authorId: contact.id,
      text: body,
      delay: t,
      typingFor,
      tapbackOnYou: i === 0 && tapback && maybe(0.45) ? tapback : undefined,
    };
    t += typingFor + 600 + Math.random() * 700;
    return turn;
  });
}
