// Note: `matchMedia`, `ResizeObserver`, `scrollIntoView`, and canvas
// `getContext` are already stubbed globally in `setup/jsdom-stubs.ts`;
// `stubMatchMedia` is only needed to override the global stub.
//
// This barrel is also imported by the browser suites, so it must stay free
// of node-only modules — `walk-source` (node:fs) is imported directly by
// the boundary tests instead.
export { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
export { axe, axePage } from './axe'
export { makeCanvasContext } from './make-canvas-context'
export { makeChangeEvent } from './make-change-event'
export { makeFileList } from './make-file-list'
export { makeFocusEvent } from './make-focus-event'
export { makeKeyEvent } from './make-key-event'
export { makePointerEvent } from './make-pointer-event'
export { mockDomGeometry } from './mock-dom-geometry'
export { noop } from './noop'
export { renderUI } from './render-ui'
export { allBySlot, bySlot } from './slot-queries'
export { stubMatchMedia } from './stub-match-media'
