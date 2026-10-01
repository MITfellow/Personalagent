import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import App from './App';
import { primeDemoWorld } from './test/prime';

/** Fails the build on serious/critical accessibility violations. */
async function audit(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom has no layout engine, so contrast cannot be measured here
      'color-contrast': { enabled: false },
    },
  });
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

describe('accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    primeDemoWorld();
  });

  it('the main window has no serious axe violations', async () => {
    const { container } = render(<App />);
    const violations = await audit(container);
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  }, 30_000);
});
