import { useEffect, useRef, useState } from 'react';
import type { Attachment, BubbleEffect, Chat, Message, ScreenEffect } from '../types';
import { BUBBLE_EFFECTS, SCREEN_EFFECTS } from '../types';
import { useStore } from '../lib/context';
import { EMOJI } from '../data/emoji';
import { Floating } from './Floating';
import { IconCamera, IconMic, IconPhotos, IconPlus, IconSend, IconSmiley, IconSparkle, IconWave, IconX } from './Icons';

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
  const [atts, setAtts] = useState<Attachment[]>([]);
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

  const canSend = draft.trim().length > 0 || atts.length > 0;

  const doSend = () => {
    if (!canSend) return;
    send(chat.id, {
      text: draft.trim(),
      subject: subject?.trim() || undefined,
      attachments: atts,
      replyTo: replyTo?.id,
      bubbleEffect: bubbleFx,
      screenEffect: screenFx,
    });
    setAtts([]);
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

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .slice(0, 6)
      .forEach((f) => {
        if (f.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () =>
            setAtts((a) => [...a, { id: attId(), kind: 'image', src: String(reader.result) }]);
          reader.readAsDataURL(f);
        } else {
          setAtts((a) => [
            ...a,
            { id: attId(), kind: 'file', name: f.name, size: `${(f.size / 1024 / 1024).toFixed(1)} MB` },
          ]);
        }
      });
  };

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
      className="composer-wrap"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
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

      {atts.length > 0 && (
        <div className="attach-strip">
          {atts.map((a) => (
            <div className="attach-chip" key={a.id}>
              {a.kind === 'image' ? <img src={a.src} alt="" /> : <span>{a.name ?? a.kind}</span>}
              <button className="x" onClick={() => setAtts((x) => x.filter((y) => y.id !== a.id))}>
                <IconX size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {recording > 0 && (
        <div className="reply-banner" style={{ background: 'rgba(255,59,48,.14)' }}>
          <span
            style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--red)', animation: 'fade-in .6s infinite alternate' }}
          />
          <div className="rb-text">Recording… {recording}s</div>
          <button
            className="btn"
            onClick={() => {
              setAtts((a) => [
                ...a,
                {
                  id: attId(),
                  kind: 'audio',
                  duration: recording,
                  waveform: Array.from({ length: 34 }, () => 0.15 + Math.random() * 0.85),
                },
              ]);
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
                setAtts((a) => [
                  ...a,
                  { id: attId(), kind: 'image', src: STOCK_PHOTOS[a.length % STOCK_PHOTOS.length] },
                ]);
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
                setAtts((a) => [
                  ...a,
                  {
                    id: attId(),
                    kind: 'link',
                    src: 'https://maps.example/current',
                    title: 'My Current Location',
                    domain: 'maps.example',
                    description: 'Shared from Maps · accurate to 10 m',
                  },
                ]);
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
    </div>
  );
}
