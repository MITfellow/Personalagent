import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cameraStream,
  captureFrame,
  hasMultipleCameras,
  MediaError,
  stopStream,
  type Capture,
} from '../lib/media';
import { IconFlip, IconX } from './Icons';

interface Props {
  onCapture: (shot: Capture) => void;
  onClose: () => void;
}

/**
 * A real camera. Opens the device, shows the live preview, and hands back a
 * still the user has had a chance to look at before it is sent — a shutter
 * that fires straight into the thread is a shutter people stop trusting.
 */
export default function CameraSheet({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [canFlip, setCanFlip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<Capture | null>(null);
  const [flash, setFlash] = useState(false);

  // the front lens is shown mirrored, the way every video-call app does it
  const mirrored = facing === 'user';

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const stream = await cameraStream(facing);
        if (dead) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setReady(true);
        setCanFlip(await hasMultipleCameras());
      } catch (e) {
        if (!dead) setError(e instanceof MediaError ? e.message : 'Could not start the camera.');
      }
    })();

    return () => {
      dead = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [facing]);

  // Escape closes, space/enter fires the shutter — the shortcuts a camera owes you
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const take = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const frame = captureFrame(v, 1600, mirrored);
      setShot(frame);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 180);
    } catch (e) {
      setError(e instanceof MediaError ? e.message : 'Could not take the photo.');
    }
  }, [mirrored]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal cam-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Camera"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cam-head">
          <strong>Camera</strong>
          <button className="round bare" onClick={onClose} aria-label="Close camera">
            <IconX size={14} />
          </button>
        </header>

        <div className="cam-stage">
          {error ? (
            <div className="cam-error" role="alert">
              <div className="cam-error-title">Camera unavailable</div>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className={`cam-video ${mirrored ? 'mirror' : ''} ${shot ? 'hidden' : ''}`}
                playsInline
                muted
                autoPlay
              />
              {shot && <img className="cam-shot" src={shot.src} alt="Captured photo" />}
              {!ready && !shot && <div className="cam-waiting">Starting camera…</div>}
              {flash && <div className="cam-flash" />}
            </>
          )}
        </div>

        <footer className="cam-bar">
          {shot ? (
            <>
              <button className="btn" onClick={() => setShot(null)}>
                Retake
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  onCapture(shot);
                  onClose();
                }}
              >
                Use Photo
              </button>
            </>
          ) : (
            <>
              <span className="cam-slot">
                {canFlip && (
                  <button
                    className="round bare"
                    onClick={() => {
                      // reset here rather than in the effect: a cascading
                      // setState during the effect re-renders twice
                      setReady(false);
                      setError(null);
                      setFacing((f) => (f === 'user' ? 'environment' : 'user'));
                    }}
                    aria-label="Switch camera"
                    title="Switch camera"
                  >
                    <IconFlip size={16} />
                  </button>
                )}
              </span>
              <button
                className="shutter"
                onClick={take}
                disabled={!ready || !!error}
                aria-label="Take photo"
              />
              <span className="cam-slot" />
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
