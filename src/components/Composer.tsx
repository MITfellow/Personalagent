import { useEffect, useRef, useState } from 'react';
import type { Attachment, BubbleEffect, Chat, Message, ScreenEffect } from '../types';
import { BUBBLE_EFFECTS, SCREEN_EFFECTS } from '../types';
import { useStore } from '../lib/context';
import { EMOJI } from '../data/emoji';
import { Floating } from './Floating';
import { IconCamera, IconMic, IconPhotos, IconPlus, IconSend, IconSmiley, IconSparkle, IconWave, IconX } from './Icons';
import { AttachTray, type Staged } from './AttachTray';
import { Lightbox } from './Lightbox';
import { MAX_FILES, decodeImage, fileKey, humanSize, isImageFile, rejectReason } from '../lib/files';

const STOCK_PHOTOS = ['/photos/golden-hour.jpg', '/photos/ceramics.jpg'];

let aid = 0;
const attId = () => `att${Date.now().toString(36)}${aid++}`;

export function Composer({
  chat,
  replyTo,
  clearReply,
}: {
  chat: Chat;
  replyTo: Message | null;
  clearReply: () => void;
}) {
  const { state, dispatch, send, chatTitle } = useStore();
  const [staged, setStaged] = useState<Staged[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const dragDepth = useRef(0);
  // mirrors `staged` so addFiles can compute the next tray synchronously —
  // collecting notices inside a setState updater loses them, because the
  // updater runs after the call that would have read them (and twice in
  // StrictMode)
  const stagedRef = useRef<Staged[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [bubbleFx, setBubbleFx] = useState<BubbleEffect>('none');
  const [screenFx, setScreenFx] = useState<ScreenEffect>('none');
  const [pop, setPop] = useState<null | { kind: 'emoji' | 'apps' | 'fx'; x: number; y: number }>(null);
  const [recording, setRecording] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draft = chat.draft;

  const autosize = () => {
    const el = ta.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  };
  useEffect(autosize, [draft, subject]);
  useEffect(() => {
    ta.current?.focus();
  }, [chat.id]);

  // voice-memo recording timer
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setRecording((r) => r + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  const setDraft = (value: string) => dispatch({ type: 'draft', chatId: chat.id, value });

  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  const ready = staged.filter((f) => f.status === 'ready' && f.att);
  const canSend = draft.trim().length > 0 || ready.length > 0;

  const doSend = () => {
    if (!canSend) return;
    send(chat.id, {
      text: draft.trim(),
      subject: subject?.trim() || undefined,
      attachments: ready.map((f) => f.att!),
      replyTo: replyTo?.id,
      bubbleEffect: bubbleFx,
      screenEffect: screenFx,
    });
    setStaged([]);
    setNotice(null);
    setSubject(null);
    setBubbleFx('none');
    setScreenFx('none');
    clearReply();
    window.requestAnimationFrame(autosize);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      doSend();
    }
    if (e.key === 'Escape' && replyTo) clearReply();
  };

  /** stage something we built ourselves (a memo, a stock photo, a location) */
  const stage = (att: Attachment, name: string, bytes = 0) =>
    setStaged((a) => [
      ...a,
      {
        id: att.id,
        name,
        bytes,
        status: 'ready',
        att,
        preview: att.kind === 'image' ? att.src : undefined,
      },
    ]);

  /**
   * Stage files for sending. Images are decoded and downscaled off the main
   * send path so the tray can show a real thumbnail (and so a 12-megapixel
   * photo doesn't go into localStorage at full size); everything else lands
   * immediately as a typed chip.
   */
  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    if (!incoming.length) return;

    const notes: string[] = [];
    const prev = stagedRef.current;
    const commit = (next: Staged[]) => {
      stagedRef.current = next;
      setStaged(next);
      setNotice(notes[0] ?? null);
    };

    {
      const seen = new Set(prev.map((f) => fileKey({ name: f.name, size: f.bytes })));
      const room = MAX_FILES - prev.length;
      if (room <= 0) {
        notes.push(`You can attach ${MAX_FILES} files at a time`);
        commit(prev);
        return;
      }

      const next: Staged[] = [];
      let skipped = 0;
      for (const file of incoming) {
        if (next.length >= room) {
          skipped++;
          continue;
        }
        const key = fileKey(file);
        if (seen.has(key)) {
          notes.push(`${file.name} is already attached`);
          continue;
        }
        seen.add(key);

        const id = attId();
        const bad = rejectReason(file);
        if (bad) {
          next.push({ id, name: file.name, bytes: file.size, status: 'error', error: bad });
          continue;
        }

        if (isImageFile(file.type, file.name)) {
          next.push({ id, name: file.name, bytes: file.size, status: 'loading' });
          void decodeImage(file)
            .then(({ src, width, height }) =>
              setStaged((cur) =>
                cur.map((f) =>
                  f.id === id
                    ? {
                        ...f,
                        status: 'ready',
                        preview: src,
                        att: {
                          id,
                          kind: 'image',
                          src,
                          name: file.name,
                          size: humanSize(file.size),
                          width: width || undefined,
                          height: height || undefined,
                        },
                      }
                    : f,
                ),
              ),
            )
            .catch(() =>
              setStaged((cur) =>
                cur.map((f) =>
                  f.id === id ? { ...f, status: 'error', error: "Couldn't read this image" } : f,
                ),
              ),
            );
        } else {
          next.push({
            id,
            name: file.name,
            bytes: file.size,
            status: 'ready',
            att: { id, kind: 'file', name: file.name, size: humanSize(file.size) },
          });
        }
      }

      if (skipped) notes.push(`${skipped} file${skipped > 1 ? 's' : ''} skipped — ${MAX_FILES} at a time`);
      commit([...prev, ...next]);
    }
  };

  // the notice is transient; it should never outstay the thing it describes
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const openPop = (kind: 'emoji' | 'apps' | 'fx') => (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPop({ kind, x: r.left, y: r.top - 8 });
  };

  /** always hand focus back to the field so Return still sends */
  const closePop = () => {
    setPop(null);
    window.setTimeout(() => ta.current?.focus(), 0);
  };

  const fxActive = bubbleFx !== 'none' || screenFx !== 'none';

  return (
    <div
      className={`composer-wrap ${dragging ? 'dropping' : ''}`}
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        // dragleave fires for every child; only the last one counts
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
      onMouseDown={(e) => {
        // clicking the empty area around the field always lands in the field
        if (e.target === e.currentTarget) {
          e.preventDefault();
          ta.current?.focus();
        }
      }}
    >
      {replyTo && (
        <div className="reply-banner">
          <span className="bar" />
          <div className="rb-text">
            <b style={{ color: 'var(--text)' }}>
              Replying to {replyTo.authorId === 'me' ? 'yourself' : state.contacts[replyTo.authorId]?.name}
            </b>
            {' · '}
            {replyTo.text || 'Attachment'}
          </div>
          <button className="icon-btn plain" style={{ width: 20, height: 20 }} onClick={clearReply}>
            <IconX size={12} />
          </button>
        </div>
      )}

      {fxActive && (
        <div className="reply-banner" style={{ background: 'rgba(10,132,255,.12)' }}>
          <IconSparkle size={13} />
          <div className="rb-text">
            Sending with{' '}
            <b style={{ color: 'var(--text)' }}>
              {[
                BUBBLE_EFFECTS.find((b) => b.id === bubbleFx)?.label,
                SCREEN_EFFECTS.find((s) => s.id === screenFx)?.label,
              ]
                .filter(Boolean)
                .join(' + ')}
            </b>
          </div>
          <button
            className="icon-btn plain"
            style={{ width: 20, height: 20 }}
            onClick={() => {
              setBubbleFx('none');
              setScreenFx('none');
            }}
          >
            <IconX size={12} />
          </button>
        </div>
      )}

      <AttachTray
        items={staged}
        notice={notice}
        onRemove={(id) => setStaged((x) => x.filter((y) => y.id !== id))}
        onClear={() => {
          setStaged([]);
          setNotice(null);
        }}
        onPreview={setZoom}
      />

      {recording > 0 && (
        <div className="reply-banner" style={{ background: 'rgba(255,59,48,.14)' }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--red)', animation: 'fade-in .6s infinite alternate' }}
          />
          <div className="rb-text">Recording… {recording}s</div>
          <button
            className="btn"
            onClick={() => {
              stage(
                {
                  id: attId(),
                  kind: 'audio',
                  duration: recording,
                  waveform: Array.from({ length: 34 }, () => 0.15 + Math.random() * 0.85),
                },
                `Voice memo · ${recording}s`,
              );
              setRecording(0);
            }}
          >
            Stop
          </button>
          <button className="btn" onClick={() => setRecording(0)}>
            Cancel
          </button>
        </div>
      )}

      <div className="composer">
        <button className="round" title="Apps & attachments" onClick={openPop('apps')}>
          <IconPlus />
        </button>

        <div className="field">
          <div className="field-col">
            {subject !== null && (
              <>
                <input
                  className="subject-input"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ta.current?.focus()}
                />
                <div className="subject-divider" />
              </>
            )}
            <textarea
              ref={ta}
              rows={1}
              value={draft}
              placeholder={chat.sms ? 'Text Message' : 'iMessage'}
              aria-label={chat.sms ? 'Text Message' : 'iMessage'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={(e) => {
                const items = e.clipboardData.files;
                if (items?.length) {
                  e.preventDefault();
                  addFiles(items);
                }
              }}
            />
          </div>
          {canSend ? (
            <button className={`send-btn ${chat.sms ? 'sms' : ''}`} onClick={doSend} title="Send (Return)">
              <IconSend />
            </button>
          ) : (
            <button className="round bare" title="Record an audio message" onClick={() => setRecording(1)}>
              <IconWave size={16} />
            </button>
          )}
        </div>

        <button className="round bare" title="Emoji & stickers" onClick={openPop('emoji')}>
          <IconSmiley size={18} />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {pop?.kind === 'emoji' && (
        <Floating x={pop.x} y={pop.y} place="top-start" onClose={closePop} className="emoji-pop">
          {EMOJI.map((group) => (
            <div key={group.cat}>
              <div className="emoji-cat">{group.cat}</div>
              <div className="emoji-grid">
                {group.list.map((e, i) => (
                  <button
                    key={`${e}${i}`}
                    onClick={() => {
                      setDraft(draft + e);
                      ta.current?.focus();
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Floating>
      )}

      {pop?.kind === 'apps' && (
        <Floating x={pop.x} y={pop.y} place="top-start" onClose={closePop} className="apps-pop">
          <div className="apps-grid">
            <button
              className="app-tile"
              onClick={() => {
                fileRef.current?.click();
                closePop();
              }}
            >
              <span className="glyph" style={{ background: 'linear-gradient(160deg,#ffd166,#ef476f)' }}>
                <IconPhotos size={17} />
              </span>
              Photos
            </button>
            <button
              className="app-tile"
              onClick={() => {
                const src = STOCK_PHOTOS[staged.length % STOCK_PHOTOS.length];
                stage({ id: attId(), kind: 'image', src }, src.split('/').pop() ?? 'Photo');
                closePop();
              }}
            >
              <span className="glyph" style={{ background: 'linear-gradient(160deg,#8e8e93,#48484a)' }}>
                <IconCamera size={17} />
              </span>
              Camera
            </button>
            <button
              className="app-tile"
              onClick={() => {
                setRecording(1);
                closePop();
              }}
            >
              <span className="glyph" style={{ background: 'linear-gradient(160deg,#ff6b6b,#c9184a)' }}>
                <IconMic size={16} />
              </span>
              Audio
            </button>
            <button
              className="app-tile"
              onClick={() => {
                stage(
                  {
                    id: attId(),
                    kind: 'link',
                    src: 'https://maps.example/current',
                    title: 'My Current Location',
                    domain: 'maps.example',
                    description: 'Shared from Maps · accurate to 10 m',
                  },
                  'My Current Location',
                );
                closePop();
              }}
            >
              <span className="glyph" style={{ background: 'linear-gradient(160deg,#5ac8fa,#0a84ff)' }}>
                📍
              </span>
              Location
            </button>
            <button
              className="app-tile"
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setPop({ kind: 'fx', x: r.left, y: r.top - 8 });
              }}
            >
              <span
                className="glyph"
                style={{ background: fxActive ? 'var(--blue)' : 'linear-gradient(160deg,#ffd60a,#ff9f0a)' }}
              >
                <IconSparkle size={16} />
              </span>
              Effects
            </button>
            <button
              className="app-tile"
              onClick={() => {
                setSubject(subject === null ? '' : null);
                closePop();
              }}
            >
              <span className="glyph" style={{ background: 'linear-gradient(160deg,#a78bfa,#6c4dff)' }}>
                T
              </span>
              Subject
            </button>
          </div>
        </Floating>
      )}

      {pop?.kind === 'fx' && (
        <Floating x={pop.x} y={pop.y} place="top-start" onClose={closePop} className="effects-pop">
          <h4>Bubble Effects</h4>
          <div className="effect-grid">
            {BUBBLE_EFFECTS.map((b) => (
              <button
                key={b.id}
                className={`effect-chip ${bubbleFx === b.id ? 'on' : ''}`}
                onClick={() => setBubbleFx(bubbleFx === b.id ? 'none' : b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
          <h4 style={{ marginTop: 12 }}>Screen Effects</h4>
          <div className="effect-grid">
            {SCREEN_EFFECTS.map((s) => (
              <button
                key={s.id}
                className={`effect-chip ${screenFx === s.id ? 'on' : ''}`}
                onClick={() => setScreenFx(screenFx === s.id ? 'none' : s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => {
                setBubbleFx('none');
                setScreenFx('none');
              }}
            >
              Clear
            </button>
            <button className="btn primary" style={{ flex: 1 }} onClick={closePop}>
              Done
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.4 }}>
            Tip: effects play when the message is sent — and Invisible Ink stays hidden until clicked.
          </div>
        </Floating>
      )}

      <div className="send-hint">{canSend ? 'Return to send · ⇧Return for a new line' : `To: ${chatTitle(chat)}`}</div>

      {dragging && (
        <div className="drop-veil" aria-hidden="true">
          <div className="drop-card">
            <IconPhotos size={22} />
            <div className="drop-title">Drop to attach</div>
            <div className="drop-sub">Up to {MAX_FILES} files</div>
          </div>
        </div>
      )}

      {zoom && (
        <Lightbox items={[{ src: zoom, caption: 'Not sent yet' }]} startSrc={zoom} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}
