import { useId } from 'react';

/**
 * The Veo mark: a speech bubble with the V cut out of it.
 *
 * The gradient needs an id, and this renders in several places at once (the
 * welcome pane, Settings, the crash screen), so the id comes from `useId` —
 * two copies with the same gradient id would make the second one reference
 * the first, which breaks the moment the first unmounts.
 */
export function Logo({ size = 44, title }: { size?: number; title?: string }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`veo-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7A5CFF" />
          <stop offset="0.55" stopColor="#5B6BFF" />
          <stop offset="1" stopColor="#2FB0FF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#veo-${id})`} />
      <path
        fill="#fff"
        opacity="0.22"
        d="M32 12c-10.5 0-19 6.6-19 14.8 0 4.6 2.7 8.7 6.9 11.4V46a1.6 1.6 0 0 0 2.5 1.3l6.2-4.2c1.1.1 2.2.2 3.4.2 10.5 0 19-6.6 19-14.8S42.5 12 32 12Z"
      />
      <path fill="#fff" d="M22.6 19.2h5.1l4.3 12.9 4.3-12.9h5.1l-7 18.6h-4.8l-7-18.6Z" />
    </svg>
  );
}

/** Mark plus wordmark, for headers and the welcome pane. */
export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div className="wordmark">
      <Logo size={size} />
      <span className="wordmark-text" style={{ fontSize: size * 0.62 }}>
        Veo
      </span>
    </div>
  );
}
