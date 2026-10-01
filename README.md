# Messages — a full iMessage clone

A pixel-faithful recreation of Apple Messages (macOS/iOS) built with React + TypeScript + Vite.
No backend required: conversations, contacts and settings live in `localStorage`, and the people
you talk to reply on their own through a small persona-driven engine.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the built bundle (service worker active)
npm test           # 48 unit + integration tests
npm run typecheck  # tsc --build
npm run lint       # oxlint
```

---

## Chrome
Rebuilt to match macOS Messages (Tahoe) exactly: rounded window with a shadow on a desktop
backdrop, traffic lights, a filter button, the floating glass **compose** and **FaceTime**
buttons, and the translucent thread header — centered avatar with the name pill underneath that
messages blur beneath as they scroll. Conversation rows use avatar-inset hairline separators and a
blue rounded selection. The composer is `+ · [ field … waveform ] · emoji`, with message effects
living in the `+` tray; the field itself is fully transparent — only a hairline ring and a soft
blue focus glow — the placeholder sits at 45% so it never competes with real text, and the whole
composer bar is translucent with a 22px backdrop blur so messages blur through as they scroll
under it. Bubble tails are a short, blunt two-layer hook: 17px tall (never shorter than the bubble
radius, or the corner steps), only 4px of overhang, a 7px-rounded tip and a shallow inner hook —
simple, not a long pointed spike. The wedge reaches ~15px back *into* the bubble, so it carries
`z-index: -1`: positioned pseudo-elements otherwise paint above inline content and shave the
bottom-right of the final glyph ("Kiln" rendering as "Kilr"). See `docs/detail-pass.png` and
`docs/ui-fix-pass.png`.

**Pinned conversations** sit above the list exactly as macOS draws them: a three-up grid of large
circular avatars (group chats get the layered cluster), the newest unread message floating over the
tile in a little white balloon, the newest tapback stuck to the avatar as a mini bubble, a blue dot
beside the name when unread, and a filled blue rounded tile for the open conversation. Tapbacks on
bubbles carry the two trailing dots that make them read as tiny speech bubbles.

## What's in it

### Conversation list
- Pinned conversations as a circular grid at the top (stable order — pins never reshuffle)
- Unread dots, per-chat unread counts, a count badge in the window title
- Smart timestamps: `9:41 AM` → `Yesterday` → `Tuesday` → `12/04/25`
- Previews that understand attachments (`📷 Photo`, `🎙 Audio Message`, `🔗 Link`), `You:` prefix,
  "sent with Invisible Ink", "Message unsent"
- Live `typing…` preview, mute icon, group avatar clusters
- Search across contact names **and** message bodies (⌘K) — results are split into **Conversations**
  and **Messages**, matches are highlighted, and clicking a message hit opens that thread and
  scrolls straight to the message (loading older history first if it isn't mounted yet)
- Right-click a row: Pin / Hide Alerts / Mark as Unread / Delete

### Thread
- Real iMessage bubble geometry — gradient blue (iMessage), green (SMS), gray incoming,
  with CSS bubble **tails** drawn only on the last message of a group
- Message grouping (same sender within 2 min) and date separators (`Today 9:41 AM`)
- Delivery lifecycle: **Sending… → Sent → Delivered → Read 10:42 AM**
- Tapbacks (❤️ 👍 👎 😂 ‼️ ❓) with the pop animation, stacked per person, yours highlighted
- Inline replies with a quoted bubble that scrolls + flashes the original on click
- Edit, Undo Send ("You unsent a message"), Copy, Delete
- Emoji-only messages render jumbo with no bubble, exactly like iOS
- Attachments: photos (aspect-ratio reserved so the thread never jumps), voice notes with a
  scrubbable waveform, link preview cards, file cards, shared-location card
- Typing indicator with the correct person's avatar in group chats
- Group chats: sender names, avatars on the last bubble of each run, system notices
- An **unread divider** ("Unread Messages") marks where you left off when you reopen a thread
- A floating **jump-to-latest** button appears the moment you scroll away from the bottom
- **Drop files anywhere on the thread** to send them — the thread outlines itself and shows a
  "Drop to send" card while you drag

### Composer
- Auto-growing field, ↩ to send, ⇧↩ for a newline, per-conversation drafts that persist
- Emoji picker (6 categories), apps tray (Photos, Camera, Audio, Location, Stickers, Subject)
- Optional bold **Subject** line
- Drag-and-drop / paste images, file picker, recordable voice memos
- **Bubble effects**: Slam, Loud, Gentle, Invisible Ink (blurred + animated particles until clicked)
- **Screen effects**: Echo, Spotlight, Balloons, Confetti, Love, Lasers, Fireworks, Celebration —
  all hand-written canvas particle systems

### Details panel (⌘I)
Contact card, quick actions, Hide Alerts / read receipts / auto-reply switches, group roster,
double-click to rename a group (posts "You named the conversation …"), shared photos grid, links.

### System
- Light / Dark / System themes with full iOS token set, translucent toolbars
- Synthesized sounds (WebAudio, no asset files): send swoosh, receive pop, tapback thunk —
  muted conversations stay silent
- Comfortable / Compact density
- Responsive: three-pane desktop → two-pane → single-pane phone layout with a back button
  and safe-area insets
- Shortcuts: ⌘K search · ⌘N new message · ⌘I details · ⌥↑/⌥↓ switch conversation · ↑ edit last ·
  Esc dismiss — all of them listed in a **⌘/ shortcut sheet**
- Reset Data wipes every conversation and returns the app to a clean install

### First run
The app ships **empty** — no conversations, no messages. The sidebar shows a *No Conversations*
state with a **New Message** button; pick someone from the contact directory, hit **Start Chat**
and the thread (and its persona-driven replies) begins from nothing. Everything you create is
yours and persists locally; **Reset Data** returns to that clean state.

### The people
Eight contacts with personas (partner, friend, family, work, business) drive the reply engine in
`src/lib/bot.ts`: keyword rules first, persona fallback second, with realistic typing delays,
occasional double-texts, tapbacks on your message, and a second person chiming in on group threads.

---

## Layout

```
src/
  types.ts              domain model (Message, Chat, Contact, effects, tapbacks)
  data/seed.ts          the contact directory + the empty initial store (no fake history)
  test/demo-world.ts    test-only fixture: the sample conversations used by the specs
  data/emoji.ts         emoji picker catalogue
  lib/store.tsx         reducer + context, persistence, delivery/typing/reply orchestration
  lib/bot.ts            persona reply engine
  lib/time.ts           timestamp + grouping rules
  lib/sound.ts          WebAudio sound kit
  lib/persist.ts        versioned localStorage: migration, quota pruning, export/import
  lib/notify.ts         Notification API wrapper (background tabs only)
  lib/sw.ts             service-worker registration + "update ready" handshake
  lib/reducer.ts        pure state machine (unit-tested in isolation)
  lib/context.ts        store context + useStore hook
  components/
    Sidebar.tsx         conversation list, pins, search, row menu
    ChatView.tsx        thread header + glue
    MessageList.tsx     grouping, separators, receipts, autoscroll
    Bubble.tsx          bubbles, tails, tapbacks, attachments, context menu, invisible ink
    Composer.tsx        field, emoji, apps, effects, attachments
    DetailsPanel.tsx    info pane
    Effects.tsx         canvas screen effects
    Modals.tsx          new message + settings
    Floating.tsx        viewport-clamped popover portal
    Avatar.tsx          gradient avatars + group clusters
    Icons.tsx           hand-drawn SF-style icon set
    ErrorBoundary.tsx   crash screen with Reload / Reset data
  lib/*.test.ts         unit suites (reducer, time, bot, persistence)
  App.test.tsx          Testing Library integration specs
  test/setup.ts         jsdom polyfills (matchMedia, ResizeObserver, animate)
public/
  sw.js                 offline cache (precache + stale-while-revalidate)
  manifest.webmanifest  installable PWA metadata
  icons/                192 / 256 / 384 / 512 + maskable + apple-touch
```

---

## Production

Everything needed to actually ship this, not just demo it.

| Area | What's there |
| --- | --- |
| **Installable PWA** | `manifest.webmanifest`, maskable + apple-touch icons, standalone display, a "New Message" app shortcut (`/?compose=1`), light/dark `theme-color` |
| **Offline** | `public/sw.js` precaches the shell and every hashed asset (the list is injected at build time by a Vite plugin), then stale-while-revalidate for same-origin GETs; navigations fall back to the cached shell, so a cold reload with no network still boots the full app |
| **Updates** | A new build is detected automatically; an "A new version is available — Reload" banner calls `SKIP_WAITING` and reloads once the new worker takes over |
| **Failure handling** | `ErrorBoundary` replaces a crash with a recovery screen (Reload / Reset all data) instead of a white page |
| **Offline sending** | Messages sent while offline settle into **Not Delivered** with a **Try Again** action; a status banner explains why |
| **Storage safety** | Versioned envelope (`v3`) with migration from the older keys, corrupt JSON is ignored, `QuotaExceededError` prunes old photo payloads and warns, and Settings → Data does JSON **export / import** |
| **Notifications** | Opt-in desktop notifications that only fire when the tab is hidden and the chat isn't muted |
| **Accessibility** | Landmarks + skip link, the conversation list is a `listbox` with keyboard activation (pinned tiles and search hits live in their own labelled groups, so the listbox only ever contains options), the thread is an `aria-live` log, labelled icon buttons and tapbacks, `role="switch"` toggles, a visible focus ring everywhere, full `prefers-reduced-motion` support — and an **automated axe-core audit runs in CI** and fails on any serious or critical violation |
| **Performance** | Messages indexed by chat in a `Map`, memoised bubbles, and long threads mount only the last 120 messages behind a "Load earlier" control; React is split into its own chunk |
| **Tests & CI** | **51 vitest tests** — reducer, time rules, reply engine, persistence, an axe-core a11y audit, plus Testing Library integration specs that boot the whole app (send, keyboard navigation, settings, persistence, offline banner) — and **29 Playwright end-to-end specs** (`npm run e2e`) that run against the real production build on desktop **and** an emulated iPhone: boot, send + auto-reply + receipts, cross-thread search and jump, tapbacks, theme persistence across a reload, service-worker registration and a **cold offline reload**, single-pane mobile navigation, plus a **UI-regression suite** that asserts bubble tails paint behind the text, that no label is clipped by its own box, that popovers stay inside the window, that reply quotes hug their text, and that dark-mode elevated surfaces differ from the sidebar — plus a **first-run suite** covering the empty install, the contact directory, starting the very first conversation, and Reset Data. Specs that need history seed it through `e2e/fixture.ts`, so the shipped app stays empty. GitHub Actions runs typecheck → lint → test → build, then the E2E suite as its own job with the HTML report uploaded as an artifact |
| **Deploy** | Multi-stage `Dockerfile` (node build → nginx) with `nginx.conf` (SPA fallback, immutable asset caching, no-cache `sw.js`, security headers), plus `vercel.json` and `netlify.toml` with the same rules |

```bash
docker build -t messages .
docker run -p 8080:80 messages
```
