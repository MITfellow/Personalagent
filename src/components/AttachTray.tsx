import type { Attachment } from '../types';
import { fileTint, humanSize, shortName, typeLabel } from '../lib/files';
import { IconX } from './Icons';

/** A file in the composer that hasn't been sent yet. */
export interface Staged {
  id: string;
  name: string;
  bytes: number;
  status: 'loading' | 'ready' | 'error';
  error?: string;
  /** what gets sent once it's ready */
  att?: Attachment;
  /** thumbnail for images */
  preview?: string;
}

function Tile({ item, onRemove, onPreview }: { item: Staged; onRemove: () => void; onPreview?: () => void }) {
  const image = !!item.preview;
  const failed = item.status === 'error';
  const label =
    item.status === 'error'
      ? `${item.name} — ${item.error}`
      : `${item.name}, ${humanSize(item.bytes)}`;

  return (
    <div className={`stage-tile ${item.status}`} title={label}>
      <div
        className="stage-thumb"
        // a failed tile is red, so the per-type tint must not override it
        style={image || failed ? undefined : { background: fileTint(item.name) }}
        onClick={image && item.status === 'ready' ? onPreview : undefined}
        role={image && item.status === 'ready' ? 'button' : undefined}
        aria-label={image && item.status === 'ready' ? `Preview ${item.name}` : undefined}
      >
        {failed ? (
          <span className="stage-warn" aria-hidden="true">
            !
          </span>
        ) : image ? (
          <img src={item.preview} alt="" />
        ) : (
          <span className="stage-ext">{typeLabel(item.name)}</span>
        )}
        {item.status === 'loading' && <span className="stage-spinner" aria-hidden="true" />}
      </div>

      <div className="stage-meta">
        <div className="stage-name">{shortName(item.name, 18)}</div>
        <div className={`stage-size ${item.status === 'error' ? 'bad' : ''}`}>
          {item.status === 'error' ? item.error : humanSize(item.bytes)}
        </div>
      </div>

      <button className="stage-x" onClick={onRemove} aria-label={`Remove ${item.name}`}>
        <IconX size={9} />
      </button>
    </div>
  );
}

/**
 * The strip of pending attachments above the field: a thumbnail for images, a
 * tinted type badge for everything else, each with its real name and size and
 * its own remove button.
 */
export function AttachTray({
  items,
  notice,
  onRemove,
  onClear,
  onPreview,
}: {
  items: Staged[];
  notice?: string | null;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPreview: (src: string) => void;
}) {
  if (!items.length && !notice) return null;
  const ready = items.filter((i) => i.status === 'ready');
  const bytes = ready.reduce((n, i) => n + i.bytes, 0);

  return (
    <div className="stage" aria-label="Attachments to send">
      {!!items.length && (
        <div className="stage-head">
          <span>
            {ready.length} {ready.length === 1 ? 'attachment' : 'attachments'}
            {bytes > 0 && <span className="stage-total"> · {humanSize(bytes)}</span>}
          </span>
          <button className="stage-clear" onClick={onClear}>
            Remove all
          </button>
        </div>
      )}

      {notice && <div className="stage-notice">{notice}</div>}

      {!!items.length && (
        <div className="stage-rail">
          {items.map((it) => (
            <Tile
              key={it.id}
              item={it}
              onRemove={() => onRemove(it.id)}
              onPreview={() => it.preview && onPreview(it.preview)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
