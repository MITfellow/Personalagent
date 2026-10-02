/**
 * The Veo brand is typographic: the name, set tight, and nothing else.
 *
 * `size` is the cap height to aim for, so callers can ask for a wordmark that
 * matches the text around it without doing the arithmetic.
 */
export function Wordmark({ size = 40, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <span className={`wordmark-text ${muted ? 'muted' : ''}`} style={{ fontSize: size }}>
      Veo
    </span>
  );
}

export default Wordmark;
