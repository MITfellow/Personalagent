import type { MemojiSpec } from '../lib/memoji';

function Mouth({ kind, y }: { kind: NonNullable<MemojiSpec['mouth']>; y: number }) {
  if (kind === 'grin') {
    return (
      <g>
        <path d={`M40 ${y} q10 11 20 0 z`} fill="#8E3B3B" />
        <path d={`M40 ${y} q10 2 20 0`} fill="#fff" />
      </g>
    );
  }
  if (kind === 'oh') return <ellipse cx="50" cy={y + 3} rx="5" ry="6" fill="#8E3B3B" />;
  if (kind === 'soft') return <path d={`M42 ${y + 1} q8 5 16 0`} stroke="#8E3B3B" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
  return <path d={`M41 ${y} q9 8 18 0`} stroke="#8E3B3B" strokeWidth="2.6" fill="none" strokeLinecap="round" />;
}

function Hair({ spec }: { spec: MemojiSpec }) {
  const { style, hair = '#2B1D16' } = spec;
  switch (style) {
    case 'short':
      return <path d="M24 44 q2-26 26-26 t26 26 q-6-12-26-12 T24 44z" fill={hair} />;
    case 'bob':
      return (
        <g fill={hair}>
          <path d="M22 46 q0-30 28-30 t28 30 q-4-14-28-14 T22 46z" />
          <path d="M20 44 q-2 22 6 30 q-6-18 0-30z" />
          <path d="M80 44 q2 22-6 30 q6-18 0-30z" />
        </g>
      );
    case 'long':
      return (
        <g fill={hair}>
          <path d="M21 48 q0-32 29-32 t29 32 q-5-16-29-16 T21 48z" />
          <path d="M19 46 q-4 30 4 42 q-4-24 0-42z" />
          <path d="M81 46 q4 30-4 42 q4-24 0-42z" />
        </g>
      );
    case 'curly':
      return (
        <g fill={hair}>
          {[
            [32, 26, 10], [44, 20, 11], [57, 21, 11], [68, 28, 10], [27, 37, 9], [73, 37, 9],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
    case 'bun':
      return (
        <g fill={hair}>
          <circle cx="50" cy="14" r="9" />
          <path d="M23 45 q1-27 27-27 t27 27 q-5-13-27-13 T23 45z" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M23 42 q2-25 27-25 t27 25 z" fill="#2F6BE0" />
          <path d="M20 42 h36 a6 6 0 0 1 0 6 H22 a2 2 0 0 1-2-6z" fill="#2457B8" />
          <circle cx="50" cy="19" r="3" fill="#2457B8" />
        </g>
      );
    case 'bald':
    case 'alien':
    case 'robot':
    default:
      return null;
  }
}

export function Memoji({ spec, size = 44 }: { spec: MemojiSpec; size?: number }) {
  const eyeY = spec.style === 'alien' ? 48 : 50;
  const mouthY = spec.style === 'alien' ? 64 : 66;
  const headRx = spec.style === 'alien' ? 30 : 27;
  const headRy = spec.style === 'alien' ? 34 : 32;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${spec.name} memoji`}
      style={{ display: 'block', borderRadius: '50%' }}
    >
      <defs>
        <linearGradient id={`bg-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={spec.bg[0]} />
          <stop offset="100%" stopColor={spec.bg[1]} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg-${spec.id})`} />

      {/* neck + shoulders */}
      <path d="M38 78 h24 v8 q0 6-12 6 t-12-6z" fill={spec.shade} />
      <path d="M22 100 q4-14 28-14 t28 14z" fill="rgba(0,0,0,0.12)" />

      {/* ears */}
      {spec.style !== 'robot' && (
        <>
          <ellipse cx="22" cy="56" rx="5" ry="7" fill={spec.shade} />
          <ellipse cx="78" cy="56" rx="5" ry="7" fill={spec.shade} />
        </>
      )}

      {/* head */}
      {spec.style === 'robot' ? (
        <rect x="23" y="24" width="54" height="56" rx="16" fill={spec.skin} />
      ) : (
        <ellipse cx="50" cy="52" rx={headRx} ry={headRy} fill={spec.skin} />
      )}

      {spec.style === 'alien' && (
        <>
          <ellipse cx="30" cy="30" rx="4" ry="7" fill={spec.shade} transform="rotate(-25 30 30)" />
          <ellipse cx="70" cy="30" rx="4" ry="7" fill={spec.shade} transform="rotate(25 70 30)" />
        </>
      )}
      {spec.style === 'robot' && (
        <>
          <rect x="46" y="12" width="8" height="10" rx="4" fill="#8FA0B5" />
          <circle cx="50" cy="11" r="5" fill="#FF6B6B" />
          <rect x="30" y="70" width="40" height="5" rx="2.5" fill="#9FB0C4" />
        </>
      )}

      <Hair spec={spec} />

      {/* brows */}
      {spec.brows && (
        <g stroke="rgba(0,0,0,0.55)" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d={`M36 ${eyeY - 9} q5-4 10-1`} />
          <path d={`M54 ${eyeY - 10} q5-3 10 1`} />
        </g>
      )}

      {/* eyes */}
      {spec.style === 'alien' ? (
        <g fill="#1B1B1F">
          <ellipse cx="40" cy={eyeY} rx="6" ry="8" transform={`rotate(-12 40 ${eyeY})`} />
          <ellipse cx="60" cy={eyeY} rx="6" ry="8" transform={`rotate(12 60 ${eyeY})`} />
        </g>
      ) : (
        <g>
          <ellipse cx="40" cy={eyeY} rx="4.2" ry="4.8" fill="#fff" />
          <ellipse cx="60" cy={eyeY} rx="4.2" ry="4.8" fill="#fff" />
          <circle cx="40.6" cy={eyeY + 0.4} r="2.5" fill="#2B2118" />
          <circle cx="60.6" cy={eyeY + 0.4} r="2.5" fill="#2B2118" />
          <circle cx="41.6" cy={eyeY - 1} r="0.9" fill="#fff" />
          <circle cx="61.6" cy={eyeY - 1} r="0.9" fill="#fff" />
        </g>
      )}

      {/* nose */}
      {spec.style !== 'robot' && spec.style !== 'alien' && (
        <path d={`M50 ${eyeY + 5} q-2 5 1 6`} stroke={spec.shade} strokeWidth="2" fill="none" strokeLinecap="round" />
      )}

      {spec.blush && (
        <g fill="rgba(255,120,140,0.35)">
          <ellipse cx="33" cy={eyeY + 9} rx="5" ry="3" />
          <ellipse cx="67" cy={eyeY + 9} rx="5" ry="3" />
        </g>
      )}

      {spec.facial === 'beard' && (
        <path d="M27 58 q2 26 23 26 t23-26 q-3 18-23 18 T27 58z" fill="rgba(0,0,0,0.65)" />
      )}
      {spec.facial === 'stubble' && (
        <path d="M29 60 q3 22 21 22 t21-22 q-3 15-21 15 T29 60z" fill="rgba(0,0,0,0.16)" />
      )}

      <Mouth kind={spec.mouth ?? 'smile'} y={mouthY} />

      {spec.glasses === 'round' && (
        <g stroke="#3A3A3C" strokeWidth="2.2" fill="none">
          <circle cx="40" cy={eyeY} r="8" />
          <circle cx="60" cy={eyeY} r="8" />
          <path d={`M48 ${eyeY} h4`} />
        </g>
      )}
      {spec.glasses === 'square' && (
        <g stroke="#3A3A3C" strokeWidth="2.2" fill="none">
          <rect x="31" y={eyeY - 7} width="17" height="14" rx="4" />
          <rect x="52" y={eyeY - 7} width="17" height="14" rx="4" />
          <path d={`M48 ${eyeY} h4`} />
        </g>
      )}

      {spec.earrings && (
        <g fill="#F2C14E">
          <circle cx="22" cy="64" r="2.6" />
          <circle cx="78" cy="64" r="2.6" />
        </g>
      )}
    </svg>
  );
}
