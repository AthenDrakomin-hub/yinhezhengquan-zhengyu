import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock global objects
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock console methods in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Filter out React act warnings
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: An update to') &&
    args[0].includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  // Filter out specific warnings
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('DeprecationWarning') || args[0].includes('ExperimentalWarning'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Reset all mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});