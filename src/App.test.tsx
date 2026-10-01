import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { primeDemoWorld } from './test/prime';

beforeEach(() => {
  localStorage.clear();
  primeDemoWorld();
});
afterEach(() => vi.useRealTimers());

async function boot() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByPlaceholderText('Search');
  return user;
}

describe('Veo app', () => {
  it('renders pinned tiles plus the unpinned conversation list', async () => {
    await boot();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: /Weekend Trip/ })).toBeInTheDocument();
    // the seed opens Maya's thread
    expect(screen.getAllByText(/Maya/).length).toBeGreaterThan(0);
  });

  it('floats the newest unread message over its pinned tile', async () => {
    await boot();
    const mom = screen.getByRole('button', { name: /Mom, 1 unread/ });
    expect(within(mom).getByText(/Call me when you have a minute/)).toBeInTheDocument();
  });

  it('opens a conversation from a pinned tile', async () => {
    const user = await boot();
    await user.click(screen.getByRole('button', { name: /Dev Sharma/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Dev Sharma/ })).toHaveClass('selected'),
    );
  });

  it('sends a message and shows it as an outgoing bubble', async () => {
    const user = await boot();
    const field = screen.getByRole('textbox', { name: /message/i });
    await user.type(field, 'unit tested hello');
    await user.keyboard('{Enter}');
    const bubble = await screen.findByText('unit tested hello');
    expect(bubble.closest('.row')).toHaveClass('out');
    expect((field as HTMLTextAreaElement).value).toBe('');
  });

  it('switches conversation with the keyboard', async () => {
    const user = await boot();
    const rows = screen.getAllByRole('option');
    const lina = rows.find((r) => within(r).queryByText('Lina Park'))!;
    lina.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(lina).toHaveAttribute('aria-selected', 'true'));
  });

  it('opens settings and exposes the data controls', async () => {
    const user = await boot();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Export backup')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Desktop notifications' })).toBeInTheDocument();
  });

  it('persists a sent message across a remount', async () => {
    const user = await boot();
    const field = screen.getByRole('textbox', { name: /message/i });
    await user.type(field, 'survive the reload');
    await user.keyboard('{Enter}');
    await screen.findByText('survive the reload');
    await new Promise((r) => setTimeout(r, 400)); // debounced write
    cleanup();
    render(<App />);
    expect(await screen.findAllByText('survive the reload')).not.toHaveLength(0);
  });

  it('shows the offline banner when the network drops', async () => {
    await boot();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    expect(await screen.findByText(/You're offline/)).toBeInTheDocument();
  });
});
