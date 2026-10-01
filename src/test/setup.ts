import '@testing-library/jest-dom/vitest';
// jsdom has no IndexedDB; the persistence layer is exercised against a real
// implementation rather than a hand-rolled mock
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// globals are off, so RTL's auto-cleanup has to be registered by hand
afterEach(() => cleanup());

/* jsdom lacks the browser APIs the app legitimately uses. */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

if (!('ResizeObserver' in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!Element.prototype.animate) {
  Element.prototype.animate = (() => ({ finished: Promise.resolve(), cancel() {} })) as never;
}
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/** jsdom has no BroadcastChannel; cross-tab sync is covered in E2E. */
if (!('BroadcastChannel' in window)) {
  (window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = class {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
