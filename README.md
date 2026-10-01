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

![Memoji picker](docs/memoji-pass.png)

![Memoji studio](docs/memoji-studio.png)

![Attachment staging](docs/attachments.png)

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

### Attachments
Drag files anywhere over the composer and a dashed **Drop to attach** target appears; you can also
use the **+** tray, the file picker, or paste straight from the clipboard. Everything lands in a
staging tray *before* it is sent:

- images get a real thumbnail, documents get a tinted type badge (PDF red, Excel green, Zip grey…)
- each tile carries the true filename — middled-elided, extension intact — and a human size
- a running **"3 attachments · 99 KB"** header with **Remove all**
- click a staged photo to Quick Look it, captioned *Not sent yet*
- oversized (>8 MB) and empty files are refused **on the tile, with the reason**, instead of
  disappearing; the count and the send only ever include the good ones
- re-adding the same file is de-duped with a notice rather than stacking twice
- a 10-file cap, surfaced when you exceed it

Photos are decoded, clamped to a 1600px long edge and re-encoded (PNG kept for transparency, JPEG
otherwise) before they reach the store, because every attachment is persisted to localStorage — a
couple of phone photos at full resolution would exhaust the quota on the first send. The stored
`width`/`height` always describe the pixels actually saved: an earlier cut kept the *original*
bytes when the re-encode came out larger, which left the metadata describing an image that was no
longer there.

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
Click the hero avatar to give that person a Memoji.

### Memoji
Twelve illustrated characters — Ari, Milo, Zoe, Kai, Nova, Rey, Sol, Iris, Theo, Luna, Pip and
Bolt — drawn as **inline SVG** in `src/lib/memoji.ts`: no image files, no network, no CDN, so they
render identically at 24 px in the sidebar and at 76 px in the details hero, in either theme.

Pick one from the Apple-style grid (round tiles, names underneath, blue selected tile) in two
places: **Settings → Your Memoji** for yourself, and the **details panel hero** for any contact.
The choice is stored on the record as `memoji:<id>` and immediately replaces the initials
everywhere that person appears — pinned grid, conversation rows, group avatar stacks, thread
header, details hero. *Use initials instead* undoes it.

**Memoji studio.** The **New** tile opens a builder: ten skin tones, nine hairstyles, eight hair
colours, glasses, facial hair, mouth, blush, earrings and eight backdrops, all editing one spec
with a 104px live preview — plus *Surprise me*, which shuffles every trait at once. Characters you
build are saved to the store, sort to the front of the grid, and carry an **Edit** badge
(double-click works too). Deleting one also strips it from everyone wearing it, so no record is
left pointing at an avatar that can't be resolved.

`<Avatar>` resolves refs through the `useMemojiSpec` hook rather than a module lookup: a module
registry is invisible to React, so saving a character wouldn't re-render the avatars wearing it.
The registry in `memoji.ts` is still mirrored from the provider for non-component callers.

### Quick Look
Click any photo — in a bubble or in the details grid — to open a full-screen viewer: ←/→ step
through every photo in that thread (wrapping at both ends), Home/End jump to the first and last,
Esc closes, and the bar carries an "N of M" counter, the sender and timestamp, and a download
button.

### Ad-hoc recipients
Typing a phone number or email that matches nobody in the directory offers *Add as a new contact*
in New Message, so you can start a thread with someone who isn't in the list yet.

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

## Performance

Measured with `node scripts/bench.mjs`, which seeds 40 threads / 6,000 messages and times
keystroke-to-paint, thread switching, search, and main-thread long tasks. Figures are from the
**production build** (`vite preview`); the dev server runs ~2x worse because of StrictMode
double-rendering and the JSX dev runtime.

| | before | after |
|---|---|---|
| keystroke → paint (p50 / p95) | 127 / 291 ms | **13 / 15 ms** |
| thread switch (avg / max) | 403 / 617 ms | **139 / 166 ms** |
| search → results painted | 45 ms | **22 ms** |
| long tasks > 50 ms | 37 (worst 453 ms) | **0** |

At 80 threads / 14,400 messages — about as much as localStorage can hold — it is still 0 long
tasks and a 128 ms switch.

What was actually wrong:

- **Every keystroke went through the global store.** One `draft` dispatch re-rendered all 40
  sidebar rows and every bubble. Typing is now local to the composer and committed on a trailing
  debounce (and on send, thread switch and unmount), so drafts still survive reloads.
- **`toLocaleTimeString` builds a fresh `Intl` formatter per call** — once per bubble, per row,
  per separator, on every render. It was 4.2% of all CPU samples. The formatters are now built
  once and results memoised per minute behind a bounded cache.
- **The conversation row was an inline function**, so React could never skip it. It is a
  `React.memo` component taking already-computed primitives.
- **Threads rendered 120 bubbles on open.** That is far more than a viewport; the first page is
  50, with *Load Earlier* for the rest.
- **Search ran the cross-thread scan synchronously on every keystroke.** It is behind
  `useDeferredValue`, so the field stays responsive while results catch up.
- **Persistence serialised 1.3 MB of JSON straight off a timer**, landing a ~100 ms task in the
  middle of whatever you were doing. It now waits for `requestIdleCallback` (with a 2 s timeout
  so a busy main thread can't starve it) and flushes synchronously on `pagehide`.

Two correctness bugs fell out of that last change. A tab that closes now only flushes if it has
unsaved work **and** nothing else has written since — otherwise a stale background tab stamps its
copy over a newer one. And a `storage` listener means a second window adopts the newer state
instead of racing it.

## Storage

Everything lives on the device — there is no server. That storage used to be
`localStorage`, which browsers cap at roughly **5 MB**, and the app was already
hitting the wall:

- A 30,000-message account (6.5 MB) could not be written **at all**. The save
  silently failed and the app booted **empty** on the next visit.
- To stay under the cap, the quota handler **deleted the user's photos**,
  leaving behind attachments named `Photo (freed to save space)`. Losing user
  data to make room for user data is not a storage strategy.
- Every save ran `JSON.stringify` over the whole account — 1.3 MB of string
  building on the main thread, off a timer.

The account now lives in **IndexedDB** (`src/lib/db.ts`, a small dependency-free
promise wrapper; database `messages`, object store `app`). The state is stored
as a **structured clone** rather than JSON, so the stringify disappears from the
write path entirely.

| account | before | after |
|---|---|---|
| 6,000 messages (1.3 MB) | saved | saved, load 176 ms |
| 14,400 messages (3.1 MB) | saved, near the cap | saved, load 284 ms |
| 30,000 messages (6.5 MB) | **boots empty** | saved, load 236 ms, 0 long tasks |
| 100,000 messages (21.7 MB) | **boots empty** | saved, load 442 ms |
| photos in a large account | deleted to free space | kept |

Typing stays at 14 ms per keystroke and thread switches at ~150 ms even on the
100,000-message account.

### Keeping it honest

Moving the home of record is the kind of change that quietly eats data, so the
edges are the interesting part:

- **Nothing is stranded.** A load reads *both* IndexedDB and `localStorage` and
  takes whichever envelope has the newer `savedAt`. An account written by an
  older build is picked up, migrated forward, and the legacy copy is then
  deleted so it can never shadow the database.
- **Writes are serialised.** Two saves in flight can complete out of order; the
  migration write kicked off at boot really did land on top of messages sent a
  second later. Saves now run in a chain, and one already superseded by a newer
  save is dropped rather than written — which also coalesces bursts.
- **The seed never overwrites the account.** Reading the database is async, so
  the app briefly holds an empty store. Persistence is gated behind a `booted`
  flag, and the window renders a spinner instead of flashing "No Conversations"
  at someone who has hundreds.
- **Closing the tab still saves.** IndexedDB has no synchronous write, so the
  `pagehide` escape hatch writes `localStorage` (with a newer stamp) and the
  next load migrates it straight back.
- **Tabs stay in sync.** A `BroadcastChannel` announces each write with the
  writing tab's id; other tabs re-read and adopt it, and ignore their own echo.
- **`localStorage` is still the fallback**, quota handling and all, for any
  browser where IndexedDB is unavailable or blocked (private windows, hardened
  profiles).

Covered by unit tests against a real IndexedDB (`fake-indexeddb`) and by
`e2e/storage.spec.ts`, which seeds an 8 MB account, reloads, proves every photo
survived, and asserts the same payload is still refused by `localStorage`.

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
