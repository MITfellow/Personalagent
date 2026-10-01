import { useState } from 'react';
import {
  BACKDROPS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  type MemojiSpec,
  randomMemoji,
} from '../lib/memoji';
import { Memoji } from './Memoji';

/** A labelled row of round colour swatches. */
function Swatches({
  label,
  colors,
  isOn,
  onPick,
}: {
  label: string;
  colors: string[][];
  isOn: (c: string[]) => boolean;
  onPick: (c: string[]) => void;
}) {
  return (
    <div className="studio-row">
      <div className="studio-label">{label}</div>
      <div className="swatches">
        {colors.map((c) => (
          <button
            key={c.join()}
            className={`swatch ${isOn(c) ? 'on' : ''}`}
            style={{ background: c.length > 1 ? `linear-gradient(160deg, ${c[0]}, ${c[1]})` : c[0] }}
            aria-label={`${label} ${c[0]}`}
            aria-pressed={isOn(c)}
            onClick={() => onPick(c)}
          />
        ))}
      </div>
    </div>
  );
}

/** A labelled row of text chips. */
function Chips<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="studio-row">
      <div className="studio-label">{label}</div>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.id}
            className={`chip ${value === o.id ? 'on' : ''}`}
            aria-pressed={value === o.id}
            onClick={() => onPick(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Build-your-own character. Everything edits one `MemojiSpec` held locally, so
 * the preview updates instantly and nothing touches the store until Save.
 */
export function MemojiStudio({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: MemojiSpec;
  onSave: (spec: MemojiSpec) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [spec, setSpec] = useState<MemojiSpec>(initial);
  const set = (patch: Partial<MemojiSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const hairless = spec.style === 'bald' || spec.style === 'alien' || spec.style === 'robot';

  return (
    <div className="studio">
      <div className="studio-preview">
        <Memoji spec={spec} size={104} />
        <input
          className="studio-name"
          value={spec.name}
          maxLength={18}
          aria-label="Memoji name"
          placeholder="Name"
          onChange={(e) => set({ name: e.target.value })}
        />
        <button className="studio-shuffle" onClick={() => setSpec((s) => randomMemoji(s))}>
          Surprise me
        </button>
      </div>

      <div className="studio-rows">
        <Swatches
          label="Skin"
          colors={SKIN_TONES.map((t) => [...t])}
          isOn={(c) => c[0] === spec.skin}
          onPick={(c) => set({ skin: c[0], shade: c[1] })}
        />
        <Chips label="Hair" options={HAIR_STYLES} value={spec.style} onPick={(style) => set({ style })} />
        {!hairless && (
          <Swatches
            label="Hair colour"
            colors={HAIR_COLORS.map((c) => [c])}
            isOn={(c) => c[0] === spec.hair}
            onPick={(c) => set({ hair: c[0] })}
          />
        )}
        <Chips
          label="Glasses"
          options={[
            { id: 'none', label: 'None' },
            { id: 'round', label: 'Round' },
            { id: 'square', label: 'Square' },
          ]}
          value={spec.glasses ?? 'none'}
          onPick={(glasses) => set({ glasses })}
        />
        <Chips
          label="Facial hair"
          options={[
            { id: 'none', label: 'None' },
            { id: 'stubble', label: 'Stubble' },
            { id: 'beard', label: 'Beard' },
          ]}
          value={spec.facial ?? 'none'}
          onPick={(facial) => set({ facial })}
        />
        <Chips
          label="Mouth"
          options={[
            { id: 'smile', label: 'Smile' },
            { id: 'grin', label: 'Grin' },
            { id: 'soft', label: 'Soft' },
            { id: 'oh', label: 'Oh' },
          ]}
          value={spec.mouth ?? 'smile'}
          onPick={(mouth) => set({ mouth })}
        />
        <div className="studio-row">
          <div className="studio-label">Extras</div>
          <div className="chips">
            <button
              className={`chip ${spec.blush ? 'on' : ''}`}
              aria-pressed={!!spec.blush}
              onClick={() => set({ blush: !spec.blush })}
            >
              Blush
            </button>
            <button
              className={`chip ${spec.earrings ? 'on' : ''}`}
              aria-pressed={!!spec.earrings}
              onClick={() => set({ earrings: !spec.earrings })}
            >
              Earrings
            </button>
          </div>
        </div>
        <Swatches
          label="Backdrop"
          colors={BACKDROPS.map((b) => [...b])}
          isOn={(c) => c[0] === spec.bg[0]}
          onPick={(c) => set({ bg: [c[0], c[1]] })}
        />
      </div>

      <div className="studio-actions">
        {onDelete && (
          <button className="btn danger studio-delete" onClick={onDelete}>
            Delete
          </button>
        )}
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={() => onSave({ ...spec, name: spec.name.trim() || 'My Memoji' })}
        >
          Done
        </button>
      </div>
    </div>
  );
}
