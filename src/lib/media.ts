/**
 * Real device access: camera, microphone and location.
 *
 * Everything here is permission-gated hardware that can fail in a dozen
 * mundane ways — no camera plugged in, the user said no, another app holds the
 * device, the page is on plain http. Each entry point rejects with a
 * `MediaError` carrying a sentence worth showing a human, because "the promise
 * rejected" is not an error message.
 */

export type MediaErrorKind =
  | 'insecure'
  | 'unsupported'
  | 'denied'
  | 'missing'
  | 'busy'
  | 'timeout'
  | 'failed';

export class MediaError extends Error {
  kind: MediaErrorKind;
  constructor(kind: MediaErrorKind, message: string) {
    super(message);
    this.name = 'MediaError';
    this.kind = kind;
  }
}

/**
 * getUserMedia and geolocation are both gated on a secure context. localhost
 * counts, which is why the dev server works.
 */
export function secureEnough(): boolean {
  return typeof window !== 'undefined' && (window.isSecureContext ?? false);
}

export const cameraSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export const micSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== 'undefined' &&
  'MediaRecorder' in window;

export const locationSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.geolocation;

/** Turns a DOMException from getUserMedia into something worth reading. */
export function describeDeviceError(e: unknown, device: 'camera' | 'microphone'): MediaError {
  const name = (e as { name?: string })?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new MediaError(
        'denied',
        `${device === 'camera' ? 'Camera' : 'Microphone'} access was blocked. Allow it in your browser's site settings and try again.`,
      );
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new MediaError('missing', `No ${device} found on this device.`);
    case 'NotReadableError':
    case 'AbortError':
      return new MediaError('busy', `Another app is using the ${device}.`);
    default:
      return new MediaError('failed', `Could not start the ${device}.`);
  }
}

async function getStream(constraints: MediaStreamConstraints, device: 'camera' | 'microphone') {
  if (!secureEnough()) {
    throw new MediaError(
      'insecure',
      `A ${device} can only be used over a secure (https) connection.`,
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MediaError('unsupported', `This browser cannot open the ${device}.`);
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e) {
    throw describeDeviceError(e, device);
  }
}

/** Opens the camera. `facing` picks the front or rear lens on phones. */
export function cameraStream(facing: 'user' | 'environment' = 'user') {
  return getStream(
    { video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
    'camera',
  );
}

export function micStream() {
  return getStream(
    { audio: { echoCancellation: true, noiseSuppression: true }, video: false },
    'microphone',
  );
}

/** Stops every track so the camera light actually goes out. */
export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** True when the machine has more than one camera, so a flip button is useful. */
export async function hasMultipleCameras(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
}

/* ───────────────────────── stills ───────────────────────── */

export interface Capture {
  src: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Grabs the current video frame as a JPEG, clamped to `maxEdge` so a 4K webcam
 * doesn't put a 6 MB still into the thread.
 */
export function captureFrame(video: HTMLVideoElement, maxEdge = 1600, mirror = false): Capture {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new MediaError('failed', 'The camera has not produced a frame yet.');

  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new MediaError('failed', 'Could not read the frame.');

  if (mirror) {
    // the preview is mirrored like a real mirror, so the capture must match
    // what the user saw rather than what the sensor saw
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);

  const src = canvas.toDataURL('image/jpeg', 0.85);
  return { src, width: w, height: h, bytes: Math.round((src.length - 23) * 0.75) };
}

/* ───────────────────────── audio ───────────────────────── */

export interface Recording {
  src: string;
  duration: number;
  waveform: number[];
  bytes: number;
  mimeType: string;
}

/** The first container this browser will actually record into. */
export function pickAudioMime(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  const supported = (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder;
  if (!supported?.isTypeSupported) return '';
  return candidates.find((c) => supported.isTypeSupported(c)) ?? '';
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new MediaError('failed', 'Could not read the recording.'));
    r.readAsDataURL(blob);
  });
}

/**
 * Condenses however many level samples were taken into the fixed number of
 * bars a bubble draws, so the waveform in the thread is the shape of what was
 * actually said rather than decoration.
 */
export function resampleWaveform(levels: number[], bars = 34): number[] {
  if (!levels.length) return Array.from({ length: bars }, () => 0.08);
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const from = Math.floor((i / bars) * levels.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / bars) * levels.length));
    let peak = 0;
    for (let j = from; j < to && j < levels.length; j++) peak = Math.max(peak, levels[j]);
    out.push(peak);
  }
  // normalise so a quietly-recorded memo still looks like a waveform
  const loudest = Math.max(...out);
  const gain = loudest > 0.02 ? 0.95 / loudest : 1;
  return out.map((v) => Math.max(0.06, Math.min(1, v * gain)));
}

/**
 * A live microphone recording. Levels are sampled off an AnalyserNode while it
 * runs so the composer can draw a meter and the finished memo keeps its real
 * waveform.
 */
export class AudioRecording {
  private stream: MediaStream;
  private recorder: MediaRecorder;
  private chunks: Blob[] = [];
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private buf?: Uint8Array;
  private levels: number[] = [];
  private startedAt = 0;
  private stoppedAt = 0;

  private constructor(stream: MediaStream, recorder: MediaRecorder) {
    this.stream = stream;
    this.recorder = recorder;
  }

  static async start(): Promise<AudioRecording> {
    if (!micSupported()) {
      throw new MediaError('unsupported', 'This browser cannot record audio.');
    }
    const stream = await micStream();
    const mime = pickAudioMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      stopStream(stream);
      throw new MediaError('failed', 'This browser cannot record audio.');
    }

    const rec = new AudioRecording(stream, recorder);
    recorder.ondataavailable = (e) => {
      if (e.data.size) rec.chunks.push(e.data);
    };
    recorder.start(100);
    rec.startedAt = performance.now();
    rec.listen();
    return rec;
  }

  /** Taps the stream for level metering; failure here must not kill the take. */
  private listen() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);
      this.buf = new Uint8Array(this.analyser.fftSize);
    } catch {
      this.analyser = undefined;
    }
  }

  /** Current input level, 0–1. Call it per frame to drive a meter. */
  level(): number {
    if (!this.analyser || !this.buf) return 0;
    this.analyser.getByteTimeDomainData(this.buf as Uint8Array<ArrayBuffer>);
    let peak = 0;
    for (let i = 0; i < this.buf.length; i++) {
      peak = Math.max(peak, Math.abs(this.buf[i] - 128) / 128);
    }
    this.levels.push(peak);
    return peak;
  }

  get elapsed(): number {
    const end = this.stoppedAt || performance.now();
    return (end - this.startedAt) / 1000;
  }

  /** Stops the take and resolves with something that can be sent. */
  async finish(): Promise<Recording> {
    this.stoppedAt = performance.now();
    const duration = this.elapsed;
    const stopped = new Promise<void>((resolve) => {
      this.recorder.onstop = () => resolve();
    });
    if (this.recorder.state !== 'inactive') this.recorder.stop();
    await stopped;
    this.teardown();

    const type = this.recorder.mimeType || 'audio/webm';
    const blob = new Blob(this.chunks, { type });
    if (!blob.size) throw new MediaError('failed', 'The recording came out empty.');
    const src = await blobToDataUrl(blob);
    return {
      src,
      duration: Math.max(0.4, duration),
      waveform: resampleWaveform(this.levels),
      bytes: blob.size,
      mimeType: type,
    };
  }

  /** Throws the take away and releases the microphone. */
  cancel() {
    try {
      if (this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      /* already gone */
    }
    this.chunks = [];
    this.teardown();
  }

  private teardown() {
    stopStream(this.stream);
    void this.ctx?.close().catch(() => {});
    this.ctx = undefined;
    this.analyser = undefined;
  }
}

/* ───────────────────────── location ───────────────────────── */

export interface Place {
  lat: number;
  lon: number;
  accuracy: number;
}

/** Reads the device's real position. */
export function currentPosition(timeout = 12_000): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!secureEnough()) {
      reject(new MediaError('insecure', 'Location is only available over a secure (https) connection.'));
      return;
    }
    if (!locationSupported()) {
      reject(new MediaError('unsupported', 'This browser cannot share a location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new MediaError(
              'denied',
              "Location access was blocked. Allow it in your browser's site settings and try again.",
            ),
          );
        } else if (err.code === err.TIMEOUT) {
          reject(new MediaError('timeout', 'Took too long to get a location fix.'));
        } else {
          reject(new MediaError('failed', 'Could not determine your location.'));
        }
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 },
    );
  });
}
