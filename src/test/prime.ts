import { STORAGE_KEY, SCHEMA_VERSION } from '../lib/persist';
import { buildDemoStore } from './demo-world';

/**
 * Tests need conversation history, but the app itself ships empty — so they
 * write the demo world straight into storage the way a real session would.
 */
export function primeDemoWorld() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: SCHEMA_VERSION, savedAt: Date.now(), state: buildDemoStore() }),
  );
}
