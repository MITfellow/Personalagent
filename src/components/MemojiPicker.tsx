import { useState } from 'react';
import { Memoji } from './Memoji';
import { MemojiStudio } from './MemojiStudio';
import { useStore } from '../lib/context';
import { MEMOJI, type MemojiSpec, blankMemoji, isCustomId, memojiRef } from '../lib/memoji';
import { useMemojiSpec } from '../lib/useMemoji';

/**
 * Apple's "Choose a Memoji" grid: round characters on tiles, the current one
 * highlighted, names underneath. `value` is a stored avatar ref (`memoji:ari`).
 * Characters you built sit first, behind a New tile that opens the studio.
 */
export function MemojiPicker({
  value,
  onPick,
  onClear,
  label = 'Choose a Memoji',
}: {
  value?: string;
  onPick: (avatarRef: string) => void;
  onClear?: () => void;
  label?: string;
}) {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<MemojiSpec | null>(null);
  const mine = state.customMemoji ?? [];
  const current = useMemojiSpec(value);

  if (editing) {
    const existing = mine.some((m) => m.id === editing.id);
    return (
      <MemojiStudio
        initial={editing}
        onCancel={() => setEditing(null)}
        onDelete={
          existing
            ? () => {
                dispatch({ type: 'delete-memoji', id: editing.id });
                setEditing(null);
              }
            : undefined
        }
        onSave={(spec) => {
          dispatch({ type: 'save-memoji', spec });
          onPick(memojiRef(spec.id));
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="memoji-picker">
      {label && <div className="panel-label">{label}</div>}
      <div className="memoji-grid" role="radiogroup" aria-label={label || 'Choose a Memoji'}>
        <button className="memoji-tile new-memoji" onClick={() => setEditing(blankMemoji())}>
          <span className="new-memoji-disc" aria-hidden="true">
            +
          </span>
          <span className="memoji-name">New</span>
        </button>

        {[...mine, ...MEMOJI].map((m) => {
          const selected = current?.id === m.id;
          const custom = isCustomId(m.id);
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={selected}
              aria-label={m.name}
              className={`memoji-tile ${selected ? 'selected' : ''} ${custom ? 'is-custom' : ''}`}
              onClick={() => onPick(memojiRef(m.id))}
              onDoubleClick={custom ? () => setEditing(m) : undefined}
            >
              <Memoji spec={m} size={54} />
              <span className="memoji-name">{m.name}</span>
              {custom && (
                <span
                  className="memoji-edit"
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${m.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(m);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing(m);
                    }
                  }}
                >
                  Edit
                </span>
              )}
            </button>
          );
        })}
      </div>
      {onClear && (
        <button className="btn memoji-clear" onClick={onClear} disabled={!current}>
          Use initials instead
        </button>
      )}
    </div>
  );
}
