import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Vite PWA virtual module
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn().mockReturnValue(vi.fn()),
}));

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;
