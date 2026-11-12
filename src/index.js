// Public entry point for safe-template-kit.
//
// The library deliberately exposes a single render function and a single
// error class. Everything else lives in core.js so that the public surface
// stays small and stable.

export { render, TemplateError } from './core.js';
