import { useState } from 'react';
import type { Message } from '../types';
import { useStore } from '../lib/context';
import { ChatAvatar } from './Avatar';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { IconBack, IconChevron, IconFaceTime } from './Icons';
import { Wordmark } from './Logo';

export function ChatView({ onBack, onToggleDetails }: { onBack: () => void; onToggleDetails: () => void }) {
  const { activeChat, chatContacts, chatTitle } = useStore();
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // switching conversation clears the reply target (adjusted during render,
  // which is cheaper than a second render pass from an effect)
  const [shownChatId, setShownChatId] = useState(activeChat?.id);
  if (shownChatId !== activeChat?.id) {
    setShownChatId(activeChat?.id);
    setReplyTo(null);
  }

  if (!activeChat) {
    return (
      <section className="chat" id="main" aria-label="Conversation">
        <div className="no-chat">
          <Wordmark size={46} />
          <div>
            <div style={{ fontSize: 15, color: 'var(--text-2)' }}>No Conversation Selected</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>Pick one on the left, or press ⌘N to start a new one.</div>
          </div>
        </div>
      </section>
    );
  }

  const people = chatContacts(activeChat);
  const sub = activeChat.typing ? 'typing…' : people.length > 1 ? `${people.length} people` : null;
  // macOS shows just the first name for 1:1 threads, the full name for groups
  const title = chatTitle(activeChat);
  const pillName =
    people.length > 1 || /[\d@]/.test(title) ? title : title.split(' ')[0];

  return (
    <section className="chat" id="main" aria-label="Conversation">
      <div className="chat-header">
        <button className="who" onClick={onToggleDetails} title="Conversation details (⌘I)">
          <ChatAvatar chat={activeChat} contacts={people} size={44} />
          <span className="who-pill">
            {pillName}
            {sub && <span className="who-sub">· {sub}</span>}
            <IconChevron size={10} className="chev" />
          </span>
        </button>
      </div>

      <button className="icon-btn back-btn" onClick={onBack} title="Back">
        <IconBack />
      </button>
      <button className="glass-btn facetime-btn" title="FaceTime">
        <IconFaceTime />
      </button>

      <MessageList chat={activeChat} onReply={setReplyTo} />
      <Composer chat={activeChat} replyTo={replyTo} clearReply={() => setReplyTo(null)} />
    </section>
  );
}
