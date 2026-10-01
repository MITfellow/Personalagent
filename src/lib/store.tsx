import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Chat, Message, ScreenEffect, Store, Tapback } from '../types';
import { reducer } from './reducer';
import { StoreContext, type Ctx, type SendOptions } from './context';
import { buildSeedStore } from '../data/seed';
import { composeReply } from './bot';
import { playReceive, playSend, playTapback, setSoundEnabled } from './sound';
import { setCustomMemoji } from './memoji';
import {
  STORAGE_KEY,
  clearState,
  exportState,
  importState,
  loadState,
  saveState,
  storageChangedElsewhere,
} from './persist';
import { notify, notificationsAllowed, requestNotificationPermission } from './notify';

let uid = 0;
const newId = () => `u${Date.now().toString(36)}${(uid++).toString(36)}`;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const stateRef = useRef(state);
  const savedRef = useRef<Store | null>(null);
  // what we loaded is, by definition, already in storage
  if (savedRef.current === null) savedRef.current = state;
  const [effect, setEffect] = useState<ScreenEffect>('none');
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const timers = useRef<number[]>([]);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [storageIssue, setStorageIssue] = useState<string | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    state.settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : state.settings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => setSoundEnabled(state.settings.sounds), [state.settings.sounds]);

  // keep the avatar registry in step so <Avatar> can resolve custom characters
  // without every call site passing the list down
  useEffect(() => setCustomMemoji(state.customMemoji), [state.customMemoji]);

  /**
   * Persistence: debounced, quota-aware, and deferred to idle time.
   *
   * Serialising a busy account is a megabyte-plus of JSON. Doing that straight
   * off a timer lands a ~100ms task in the middle of whatever the user is
   * doing, so the write is handed to requestIdleCallback and only falls back
   * to a timeout where that doesn't exist (Safari).
   */
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let idle = 0;
    const write = () => {
      const res = saveState(state);
      savedRef.current = state;
      if (!res.ok) {
        setStorageIssue(
          res.reason === 'quota'
            ? 'Storage is full — older photos were freed to keep saving your messages.'
            : 'This browser blocked local storage, so changes will not be saved.',
        );
      }
    };

    const t = window.setTimeout(() => {
      const ric = window.requestIdleCallback;
      // the timeout guarantees the write still happens on a busy main thread
      if (ric) idle = ric(write, { timeout: 2000 });
      else write();
    }, 250);

    return () => {
      window.clearTimeout(t);
      if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle);
    };
  }, [state]);

  /**
   * Another tab (or anything else writing our key) wins: adopt its state
   * instead of racing it. Without this two open windows quietly overwrite each
   * other's messages.
   */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const next = loadState();
      if (!next) return;
      savedRef.current = next;
      stateRef.current = next;
      dispatch({ type: 'replace', store: next });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * A tab can be hidden or closed mid-debounce, so flush on the way out — but
   * only when there is something unsaved. Writing unconditionally lets a stale
   * background tab stamp its copy over a newer one from another tab.
   */
  useEffect(() => {
    const flush = () => {
      // nothing of ours is pending
      if (savedRef.current === stateRef.current) return;
      // somebody else (another tab) wrote after us — their copy is newer than
      // whatever this tab is holding, so leave it alone
      if (storageChangedElsewhere()) return;
      saveState(stateRef.current);
      savedRef.current = stateRef.current;
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const fireEffect = useCallback((e: ScreenEffect) => {
    setEffect('none');
    window.requestAnimationFrame(() => setEffect(e));
  }, []);

  /** O(n) once per message change instead of O(n) per chat render */
  const messagesByChat = useMemo(() => {
    const index = new Map<string, Message[]>();
    for (const m of state.messages) {
      const list = index.get(m.chatId);
      if (list) list.push(m);
      else index.set(m.chatId, [m]);
    }
    for (const list of index.values()) list.sort((a, b) => a.at - b.at);
    return index;
  }, [state.messages]);

  const EMPTY: Message[] = useMemo(() => [], []);
  const messagesFor = useCallback(
    (chatId: string) => messagesByChat.get(chatId) ?? EMPTY,
    [messagesByChat, EMPTY],
  );

  const chatContacts = useCallback(
    (chat: Chat) => chat.participantIds.map((id) => state.contacts[id]).filter(Boolean),
    [state.contacts],
  );

  const chatTitle = useCallback(
    (chat: Chat) => {
      if (chat.name) return chat.name;
      const people = chatContacts(chat);
      if (people.length === 1) return people[0].name;
      return people.map((p) => p.name.split(' ')[0]).join(', ');
    },
    [chatContacts],
  );

  const react = useCallback(
    (messageId: string, tapback: Tapback) => {
      dispatch({ type: 'react', messageId, tapback, by: 'me' });
      playTapback();
    },
    [],
  );

  /** Runs delivery receipts + the auto-reply conversation for an outgoing message. */
  const deliver = useCallback(
    (chatId: string, id: string, text: string) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (!chat) return;

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        later(() => dispatch({ type: 'status', id, status: 'failed' }), 600);
        return;
      }

      later(() => dispatch({ type: 'status', id, status: 'sent' }), 420);
      later(() => dispatch({ type: 'status', id, status: 'delivered' }), 950);

      if (!state.settings.autoReply) return;

      const people = chat.participantIds.map((p) => state.contacts[p]).filter(Boolean);
      if (!people.length) return;
      const isGroup = people.length > 1;
      const responder = people[Math.floor(Math.random() * people.length)];
      if (responder.persona === 'business' && Math.random() > 0.3) return;

      // the other side reads it
      later(
        () => dispatch({ type: 'status', id, status: 'read', readAt: Date.now() }),
        1400 + Math.random() * 1600,
      );

      const receive = (authorId: string, body: string) => {
        dispatch({ type: 'typing', chatId, typing: false });
        dispatch({
          type: 'push',
          message: {
            id: newId(),
            chatId,
            authorId,
            text: body,
            at: Date.now(),
            status: 'read',
            attachments: [],
            reactions: [],
            bubbleEffect: 'none',
            screenEffect: 'none',
          },
        });
        if (!chat.muted) {
          playReceive();
          notify(state.contacts[authorId]?.name ?? 'Messages', body, chatId);
        }
      };

      const turns = composeReply(responder, text, isGroup);
      let clock = 1600 + Math.random() * 900;
      turns.forEach((turn) => {
        if (turn.tapbackOnYou) {
          later(() => {
            dispatch({ type: 'react', messageId: id, tapback: turn.tapbackOnYou!, by: turn.authorId });
            playTapback();
          }, clock + 300);
        }
        const startTyping = clock + turn.delay;
        later(() => dispatch({ type: 'typing', chatId, typing: true, by: turn.authorId }), startTyping);
        later(() => receive(turn.authorId, turn.text), startTyping + turn.typingFor);
        clock = startTyping + turn.typingFor;
      });

      // a second person chimes in sometimes in groups
      if (isGroup && Math.random() < 0.45) {
        const other = people.filter((p) => p.id !== responder.id);
        const second = other[Math.floor(Math.random() * other.length)];
        const extra = composeReply(second, text, true)[0];
        const s2 = clock + 900 + Math.random() * 1200;
        later(() => dispatch({ type: 'typing', chatId, typing: true, by: second.id }), s2);
        later(() => receive(second.id, extra.text), s2 + extra.typingFor);
      }
    },
    [state.chats, state.contacts, state.settings.autoReply, later],
  );

  const send = useCallback(
    (chatId: string, opts: SendOptions) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (!chat) return;
      const id = newId();
      const msg: Message = {
        id,
        chatId,
        authorId: 'me',
        text: opts.text,
        subject: opts.subject,
        at: Date.now(),
        status: 'sending',
        attachments: opts.attachments ?? [],
        reactions: [],
        replyTo: opts.replyTo,
        bubbleEffect: opts.bubbleEffect ?? 'none',
        screenEffect: opts.screenEffect ?? 'none',
      };
      dispatch({ type: 'push', message: msg });
      dispatch({ type: 'draft', chatId, value: '' });
      if (state.settings.sendWithSound) playSend();
      if (msg.screenEffect && msg.screenEffect !== 'none') fireEffect(msg.screenEffect);
      deliver(chatId, id, opts.text);
    },
    [state.chats, state.settings.sendWithSound, deliver, fireEffect],
  );

  /** Tap a "Not Delivered" bubble to try again. */
  const retrySend = useCallback(
    (messageId: string) => {
      const msg = state.messages.find((m) => m.id === messageId);
      if (!msg || msg.status !== 'failed') return;
      dispatch({ type: 'status', id: messageId, status: 'sending' });
      deliver(msg.chatId, messageId, msg.text);
    },
    [state.messages, deliver],
  );

  const startChatWith = useCallback(
    (contactIds: string[]) => {
      const existing = state.chats.find(
        (c) =>
          c.participantIds.length === contactIds.length &&
          contactIds.every((id) => c.participantIds.includes(id)),
      );
      if (existing) {
        dispatch({ type: 'select', chatId: existing.id });
        return existing.id;
      }
      const chat: Chat = {
        id: `c-${newId()}`,
        participantIds: contactIds,
        pinned: false,
        muted: false,
        unread: 0,
        draft: '',
        typing: false,
        sms: contactIds.length === 1 && !!state.contacts[contactIds[0]]?.sms,
        lastReadAt: Date.now(),
      };
      dispatch({ type: 'new-chat', chat });
      return chat.id;
    },
    [state.chats, state.contacts],
  );

  const reset = useCallback(() => {
    clearState();
    dispatch({ type: 'replace', store: buildSeedStore() });
  }, []);

  const exportData = useCallback(() => exportState(state), [state]);

  const importData = useCallback(async (file: File) => {
    const store = await importState(file);
    dispatch({ type: 'replace', store });
  }, []);

  const enableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    const granted = result === 'granted';
    dispatch({ type: 'settings', patch: { notifications: granted } });
    return granted;
  }, []);

  const activeChat = useMemo(
    () => state.chats.find((c) => c.id === state.activeChatId) ?? null,
    [state.chats, state.activeChatId],
  );

  const value: Ctx = {
    state,
    dispatch,
    activeChat,
    messagesFor,
    chatTitle,
    chatContacts,
    send,
    retrySend,
    react,
    effect,
    fireEffect,
    startChatWith,
    reset,
    resolvedTheme,
    online,
    storageIssue,
    dismissStorageIssue: () => setStorageIssue(null),
    exportData,
    importData,
    enableNotifications,
    notificationsGranted: notificationsAllowed(),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
