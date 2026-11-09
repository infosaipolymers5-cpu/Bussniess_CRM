import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { BusinessProvider } from '@/app/providers/BusinessProvider';
import { ConnectionProvider } from '@/app/providers/ConnectionProvider';
import { LocaleProvider } from '@/app/providers/LocaleProvider';
import '@/lib/i18n';

// Mock Supabase calls in providers
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: {
            session: {
              user: {
                id: '00000000-0000-0000-0000-000000000001',
                email: 'owner@rushicrm.test',
              },
            },
          },
        }),
      ),
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: {
            user: {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'owner@rushicrm.test',
            },
          },
        }),
      ),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: '20000000-0000-0000-0000-000000000001',
                business_id: '10000000-0000-0000-0000-000000000001',
                user_id: '00000000-0000-0000-0000-000000000001',
                role: 'owner',
                is_active: true,
              },
            ],
          }),
        }),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: '10000000-0000-0000-0000-000000000001',
              kind: 'cattle_feed',
              name: 'Rushi Cattle Feed',
              timezone: 'Asia/Kolkata',
            },
          ],
        }),
      }),
    }),
  },
}));

async function renderAppShell(ui: React.ReactNode) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <BusinessProvider>
            <ConnectionProvider>
              <LocaleProvider>
                <AppShell>{ui}</AppShell>
              </LocaleProvider>
            </ConnectionProvider>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    // Allow asynchronous auth and membership state updates to resolve cleanly
    await new Promise((r) => setTimeout(r, 0));
  });
  return result!;
}

describe('AppShell Responsive Navigation', () => {
  it('renders top bar with banner landmark', async () => {
    await renderAppShell(<div>Dashboard Content</div>);
    const banner = screen.getByRole('banner');
    expect(banner).toBeInTheDocument();
  });

  it('renders desktop sidebar navigation', async () => {
    await renderAppShell(<div>Dashboard Content</div>);
    const sidebar = screen.getByLabelText('Sidebar Navigation');
    expect(sidebar).toBeInTheDocument();
  });

  it('renders mobile bottom navigation bar', async () => {
    await renderAppShell(<div>Dashboard Content</div>);
    const mobileNav = screen.getByLabelText('Mobile Bottom Navigation');
    expect(mobileNav).toBeInTheDocument();
  });

  it('renders main content area landmark', async () => {
    await renderAppShell(<div>Dashboard Content</div>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent('Dashboard Content');
  });
});
