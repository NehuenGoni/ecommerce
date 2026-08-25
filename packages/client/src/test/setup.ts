import "@testing-library/jest-dom/vitest";

// jsdom no implementa matchMedia; lo necesitan useTheme (prefers-color-scheme)
// y cualquier chequeo de tema del sistema.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
