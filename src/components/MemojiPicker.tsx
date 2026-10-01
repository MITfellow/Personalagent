import { Memoji } from './Memoji';
import { MEMOJI, memojiRef, parseMemoji } from '../lib/memoji';

/**
 * Apple's "Choose a Memoji" grid: round characters on tiles, the current one
 * highlighted, names underneath. `value` is a stored avatar ref (`memoji:ari`).
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
  const current = parseMemoji(value);

  return (
    <div className="memoji-picker">
      <div className="panel-label">{label}</div>
      <div className="memoji-grid" role="radiogroup" aria-label={label}>
        {MEMOJI.map((m) => {
          const selected = current?.id === m.id;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={selected}
              aria-label={m.name}
              className={`memoji-tile ${selected ? 'selected' : ''}`}
              onClick={() => onPick(memojiRef(m.id))}
            >
              <Memoji spec={m} size={54} />
              <span className="memoji-name">{m.name}</span>
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
