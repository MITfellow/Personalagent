import { useMemo } from 'react';
import { accuracyLabel, accuracyRadius, buildMapArt, formatDms, mapsUrl, PIN } from '../lib/mapart';

interface Props {
  lat: number;
  lon: number;
  accuracy?: number;
  name?: string;
  /** compact variant for the composer's staging tray */
  small?: boolean;
}

/**
 * A shared location. The streets are generated from the coordinates (see
 * `mapart.ts`) so the card works offline and nothing about where the user is
 * gets sent to a tile server; the pin, the ring and the coordinates are the
 * real reading.
 */
export default function MapCard({ lat, lon, accuracy = 0, name, small = false }: Props) {
  const w = small ? 150 : 300;
  const h = small ? 92 : 176;
  const art = useMemo(() => buildMapArt(lat, lon, w, h), [lat, lon, w, h]);
  const ring = accuracyRadius(accuracy, w);
  const px = w * PIN.x;
  const py = h * PIN.y;

  const map = (
    <svg
      className="map-art"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Map of ${formatDms(lat, lon)}`}
    >
      <rect width={w} height={h} fill="var(--map-land)" />

      {art.water && (
        <path d={art.water} stroke="var(--map-water)" strokeWidth={small ? 14 : 26} fill="none" strokeLinecap="round" />
      )}

      {art.blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={1.5} fill="var(--map-block)" />
      ))}

      {art.park && (
        <rect x={art.park.x} y={art.park.y} width={art.park.w} height={art.park.h} rx={3} fill="var(--map-park)" />
      )}

      {/* casing first, then the carriageway: the trick that makes drawn roads read as roads */}
      {art.roads.map((r, i) => (
        <path key={`c${i}`} d={r.d} stroke="var(--map-road-edge)" strokeWidth={r.width + 1.6} fill="none" />
      ))}
      {art.roads.map((r, i) => (
        <path
          key={`r${i}`}
          d={r.d}
          stroke={r.major ? 'var(--map-road-major)' : 'var(--map-road)'}
          strokeWidth={r.width}
          fill="none"
        />
      ))}

      {ring > 0 && <circle cx={px} cy={py} r={ring} fill="var(--map-ring)" stroke="var(--map-ring-edge)" />}

      {/* pin */}
      <ellipse cx={px} cy={py + 9} rx={5} ry={2} fill="rgba(0,0,0,.28)" />
      <path
        d={`M${px} ${py + 9} C ${px - 7} ${py - 2}, ${px - 8} ${py - 14}, ${px} ${py - 14} C ${px + 8} ${py - 14}, ${px + 7} ${py - 2}, ${px} ${py + 9} Z`}
        fill="var(--red)"
      />
      <circle cx={px} cy={py - 8} r={3} fill="#fff" />
    </svg>
  );

  if (small) {
    return <div className="map-card small">{map}</div>;
  }

  return (
    <a
      className="map-card"
      href={mapsUrl(lat, lon)}
      target="_blank"
      rel="noreferrer"
      title="Open in Maps"
    >
      {map}
      <div className="map-foot">
        <div className="map-name">{name ?? 'Current Location'}</div>
        <div className="map-sub">{formatDms(lat, lon)}</div>
        {accuracy > 0 && <div className="map-acc">{accuracyLabel(accuracy)}</div>}
      </div>
    </a>
  );
}
