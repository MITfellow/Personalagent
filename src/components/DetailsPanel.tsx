import { useMemo, useState } from 'react';
import type { Chat } from '../types';
import { useStore } from '../lib/context';
import { Avatar, ChatAvatar } from './Avatar';
import { IconInfo, IconMuted, IconPhone, IconVideo } from './Icons';

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
      <i />
    </button>
  );
}

export function DetailsPanel({ chat, onZoom }: { chat: Chat; onZoom: (src: string) => void }) {
  const { state, dispatch, messagesFor, chatContacts, chatTitle } = useStore();
  const people = chatContacts(chat);
  const isGroup = people.length > 1;
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(chat.name ?? '');

  const photos = useMemo(
    () =>
      messagesFor(chat.id)
        .flatMap((m) => m.attachments)
        .filter((a) => a.kind === 'image' && a.src)
        .reverse(),
    [messagesFor, chat.id],
  );
  const links = useMemo(
    () => messagesFor(chat.id).flatMap((m) => m.attachments).filter((a) => a.kind === 'link'),
    [messagesFor, chat.id],
  );

  return (
    <aside className="details">
      <div className="hero">
        <ChatAvatar chat={chat} contacts={people} size={76} />
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const next = name.trim();
              if (next && next !== chat.name) {
                dispatch({ type: 'rename', chatId: chat.id, name: next });
                dispatch({
                  type: 'push',
                  message: {
                    id: `sys${Date.now().toString(36)}`,
                    chatId: chat.id,
                    authorId: 'me',
                    text: `You named the conversation “${next}”`,
                    at: Date.now(),
                    status: 'read',
                    attachments: [],
                    reactions: [],
                    bubbleEffect: 'none',
                    screenEffect: 'none',
                    system: true,
                  },
                });
              }
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            style={{
              textAlign: 'center',
              background: 'var(--search-bg)',
              border: 'none',
              outline: 'none',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 15,
              fontWeight: 600,
            }}
          />
        ) : (
          <div
            className="nm"
            onDoubleClick={() => isGroup && setRenaming(true)}
            title={isGroup ? 'Double-click to rename' : undefined}
          >
            {chatTitle(chat)}
          </div>
        )}
        <div className="hd">
          {isGroup ? `${people.length} people` : people[0]?.handle}
          {!isGroup && people[0]?.bio ? ` · ${people[0].bio}` : ''}
        </div>
      </div>

      <div className="quick-row">
        {[
          { icon: <IconPhone size={15} />, label: 'audio' },
          { icon: <IconVideo size={16} />, label: 'video' },
          { icon: <IconInfo size={16} />, label: 'info' },
        ].map((q) => (
          <button className="quick-btn" key={q.label}>
            <span className="circ">{q.icon}</span>
            {q.label}
          </button>
        ))}
      </div>

      <div className="group-card">
        <div className="gc-row">
          <IconMuted size={14} />
          Hide Alerts
          <span className="spacer" />
          <Switch
            on={chat.muted}
            onChange={(v) => dispatch({ type: 'chat-flag', chatId: chat.id, patch: { muted: v } })}
          />
        </div>
        <div className="gc-row">
          <span style={{ width: 14, textAlign: 'center' }}>✓</span>
          Send Read Receipts
          <span className="spacer" />
          <Switch
            on={state.settings.readReceipts}
            onChange={(v) => dispatch({ type: 'settings', patch: { readReceipts: v } })}
          />
        </div>
        <div className="gc-row">
          <span style={{ width: 14, textAlign: 'center' }}>↩︎</span>
          Auto-reply from contacts
          <span className="spacer" />
          <Switch
            on={state.settings.autoReply}
            onChange={(v) => dispatch({ type: 'settings', patch: { autoReply: v } })}
          />
        </div>
      </div>

      {isGroup && (
        <>
          <div className="panel-label">{people.length} People</div>
          <div className="group-card">
            {people.map((p) => (
              <div className="gc-row" key={p.id}>
                <Avatar contact={p} size={30} />
                <div>
                  <div>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.handle}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {photos.length > 0 && (
        <>
          <div className="panel-label">Photos</div>
          <div className="photo-grid">
            {photos.slice(0, 9).map((p) => (
              <img key={p.id} src={p.src} alt="" onClick={() => onZoom(p.src!)} />
            ))}
          </div>
        </>
      )}

      {links.length > 0 && (
        <>
          <div className="panel-label">Links</div>
          <div className="group-card">
            {links.map((l) => (
              <div className="gc-row" key={l.id} style={{ fontSize: 12.5 }}>
                🔗
                <div style={{ minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{l.domain}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        className="btn danger-row"
        onClick={() => {
          if (confirm('Delete this conversation?')) dispatch({ type: 'delete-chat', chatId: chat.id });
        }}
      >
        Delete Conversation
      </button>
    </aside>
  );
}
