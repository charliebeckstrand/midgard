'use client'

import { createContext } from '../../core'

/**
 * Context tuple for the headless flag: `[HeadlessContext, useHeadless]`.
 *
 * The flag is `true` inside `<HeadlessProvider>`. Headless-aware components
 * (Input, Button) drop their chrome and render the bare semantic element when
 * it is set, keeping the rest of their behavior (Control / Form wiring, disabled
 * state, `data-slot`, ref forwarding).
 *
 * @returns `useHeadless()` reads the ambient flag; `false` outside any
 * `<HeadlessProvider>` (the configured default), so the hook is safe to call anywhere.
 * @see {@link HeadlessProvider} — the provider that sets the flag.
 */
export const [HeadlessContext, useHeadless] = createContext<boolean>('Headless', {
	default: false,
})
