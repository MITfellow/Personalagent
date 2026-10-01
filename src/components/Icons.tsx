interface P {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
});

export const IconSearch = ({ size = 14 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const IconCompose = ({ size = 19 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 7.5 16.5 3.5 5.6 14.4a2 2 0 0 0-.5.9l-1 3.6 3.6-1a2 2 0 0 0 .9-.5L20.5 7.5Z" />
    <path d="m14.8 5.2 4 4" />
  </svg>
);

export const IconSend = ({ size = 15 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </svg>
);

export const IconPlus = ({ size = 15 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconSmiley = ({ size = 16 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
    <circle cx="9" cy="9.8" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSparkle = ({ size = 15 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <path d="M12 2.5 13.6 8 19 9.6 13.6 11.2 12 16.7 10.4 11.2 5 9.6 10.4 8 12 2.5Z" />
    <path d="M18.5 14.2 19.3 17 22 17.8 19.3 18.6 18.5 21.4 17.7 18.6 15 17.8 17.7 17 18.5 14.2Z" />
  </svg>
);

export const IconVideo = ({ size = 17 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="m16.5 11 5-3v8l-5-3v-2Z" />
  </svg>
);

export const IconPhone = ({ size = 16 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <path d="M6.6 3.2a1.7 1.7 0 0 1 2.3.5l1.5 2.2a1.7 1.7 0 0 1-.3 2.3l-1 .8a10.6 10.6 0 0 0 4.9 4.9l.8-1a1.7 1.7 0 0 1 2.3-.3l2.2 1.5a1.7 1.7 0 0 1 .5 2.3l-1 1.5c-.6.9-1.8 1.3-2.8 1A17.5 17.5 0 0 1 4.1 7.1c-.3-1 .1-2.2 1-2.8l1.5-1.1Z" />
  </svg>
);

export const IconInfo = ({ size = 17 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="7.8" r="1.05" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevron = ({ size = 12, className }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const IconBack = ({ size = 18 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const IconReply = ({ size = 14 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h8.5a6 6 0 0 1 6 6v1" />
  </svg>
);

export const IconMore = ({ size = 14 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);

export const IconMuted = ({ size = 12 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <path d="M10.5 5.5 7 8.5H4v7h3l3.5 3v-13Z" fill="currentColor" stroke="none" />
    <path d="m15 9.5 5 5m0-5-5 5" />
  </svg>
);

export const IconPin = ({ size = 13 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <path d="M14.5 2.5 21.5 9.5l-2.2 2.2-1-.3-3.6 3.6.4 2.6-1.8 1.8-4.3-4.3L4 20l1-5.1-4.3-4.3L2.5 8.8l2.6.4 3.6-3.6-.3-1 2.2-2.2Z" transform="translate(1.2 0.6) scale(0.92)" />
  </svg>
);

export const IconCamera = ({ size = 18 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h6l1.2 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
    <circle cx="11.8" cy="12.5" r="3.4" />
  </svg>
);

export const IconPhotos = ({ size = 18 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 17 5-5 4.5 4.5 3-2.5 4 4" />
  </svg>
);

export const IconMic = ({ size = 18 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </svg>
);

export const IconTrash = ({ size = 14 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 12.2h9L17.5 7" />
  </svg>
);

export const IconCopy = ({ size = 14 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 5.5A2.5 2.5 0 0 0 13.5 3H6.5A2.5 2.5 0 0 0 4 5.5v8A2.5 2.5 0 0 0 6.5 16" />
  </svg>
);

export const IconGear = ({ size = 17 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.6}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.5 12a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2-1.2L14.7 3h-4l-.4 2.5a7.5 7.5 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.5l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z" strokeLinejoin="round" />
  </svg>
);

export const IconCheck = ({ size = 13 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 6.5" />
  </svg>
);

export const IconPlay = ({ size = 13 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <path d="M7 4.5 19 12 7 19.5v-15Z" />
  </svg>
);

export const IconPause = ({ size = 13 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <rect x="6.5" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="13.5" y="4.5" width="4" height="15" rx="1.2" />
  </svg>
);

export const IconX = ({ size = 13 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconFilter = ({ size = 16 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
    <path d="M4 7h16M6.5 12h11M10 17h4" />
  </svg>
);

export const IconWave = ({ size = 17 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
    <path d="M5 10v4M8.5 7.5v9M12 5.5v13M15.5 8.5v7M19 10.5v3" />
  </svg>
);

export const IconFaceTime = ({ size = 19 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <rect x="2.2" y="6" width="13.2" height="12" rx="3.4" />
    <path d="M16.9 11.2 21 8.4c.5-.35 1.1 0 1.1.6v6c0 .6-.6.95-1.1.6l-4.1-2.8v-1.6Z" />
  </svg>
);

/* ── device features ─────────────────────────────────────────────── */

/** Maps' compass arrow, the glyph macOS uses for "share my location". */
export const IconLocation = ({ size = 16 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <path d="M20.6 3.4a1 1 0 0 0-1.2-1.2L4.3 7.7c-1.1.4-1 2 .1 2.3l6 1.7a1 1 0 0 1 .7.7l1.7 6c.3 1.1 1.9 1.2 2.3.1L20.6 3.4Z" />
  </svg>
);

/** A subject line: a heading rule over body text. */
export const IconSubject = ({ size = 16 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2.1} strokeLinecap="round">
    <path d="M4 6h16" />
    <path d="M4 11h11" />
    <path d="M4 16h16" />
    <path d="M4 21h8" opacity={0.45} />
  </svg>
);

/** Filled square: stop a take. */
export const IconStop = ({ size = 13 }: P) => (
  <svg {...base(size)} fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
);

/** Rotate the camera between the front and rear lens. */
export const IconFlip = ({ size = 16 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 9a8.5 8.5 0 0 1 14.2-3.3L21 9" />
    <path d="M21 4.5V9h-4.5" />
    <path d="M20.5 15a8.5 8.5 0 0 1-14.2 3.3L3 15" />
    <path d="M3 19.5V15h4.5" />
  </svg>
);

/** A microphone with its level shown as rising bars. */
export const IconWaveform = ({ size = 16 }: P) => (
  <svg {...base(size)} stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
  </svg>
);
