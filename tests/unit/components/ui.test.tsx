import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button, StatusBadge, MetricCard, OfflineBanner } from '@/components/ui';
import { ConnectionProvider } from '@/app/providers/ConnectionProvider';
import '@/lib/i18n';

describe('Accessible Shared UI Primitives', () => {
  describe('Button', () => {
    it('renders text and handles disabled state', () => {
      render(<Button disabled>Click Me</Button>);
      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeDisabled();
    });

    it('shows saving indicator when loading and sets aria-busy', () => {
      render(<Button loading>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent(/saving/i);
    });
  });

  describe('StatusBadge', () => {
    it('displays both text and icon for statuses', () => {
      render(
        <div>
          <StatusBadge status="paid" />
          <StatusBadge status="overdue" />
          <StatusBadge status="failed" />
          <StatusBadge status="pending" />
          <StatusBadge status="warning" />
        </div>,
      );

      expect(screen.getByText(/paid/i)).toBeInTheDocument();
      expect(screen.getByText(/overdue/i)).toBeInTheDocument();
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
      expect(screen.getByText(/warning/i)).toBeInTheDocument();
    });
  });

  describe('MetricCard', () => {
    it('renders label, value, and subtitle', () => {
      render(
        <MetricCard
          label="Total Outstanding"
          value="₹1,250.00"
          subtitle="Cattle Feed"
          icon="💳"
        />,
      );

      expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
      expect(screen.getByText('₹1,250.00')).toBeInTheDocument();
      expect(screen.getByText('Cattle Feed')).toBeInTheDocument();
    });

    it('displays loading skeleton with aria-busy', () => {
      render(<MetricCard label="Total Outstanding" value="₹1,250.00" loading={true} />);

      const skeleton = screen.getByRole('generic', { busy: true });
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('OfflineBanner', () => {
    it('renders assertive alert when offline and does not claim saved writes', () => {
      // Simulate offline
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      render(
        <ConnectionProvider>
          <OfflineBanner />
        </ConnectionProvider>,
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveTextContent(/offline/i);
      // Ensure no false financial claims
      expect(alert).not.toHaveTextContent(/saved/i);
    });
  });
});
