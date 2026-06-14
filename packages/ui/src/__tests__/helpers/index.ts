// `matchMedia`, `ResizeObserver`, `scrollIntoView`, and canvas `getContext`
// are stubbed globally in `setup/jsdom-stubs.ts`; `stubMatchMedia` overrides
// the global stub.
//
// The browser suites also import this barrel, so it stays free of node-only
// modules; the boundary tests import `walk-source` (node:fs) directly.
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
export { present } from './present'
export { renderUI } from './render-ui'
export { allBySlot, bySlot } from './slot-queries'
export { stubMatchMedia } from './stub-match-media'
