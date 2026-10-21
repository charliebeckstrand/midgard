'use client'

import { createContext } from '../../core'

/**
 * Context tuple for the headless flag: `[HeadlessContext, useHeadless]`.
 *
 * The flag is `true` inside `<HeadlessProvider>`. Headless-aware components
 * (Input, Textarea, FileUpload, Button) drop their chrome and render the bare
 * semantic element when it is set. The rest of their behavior stays (Control /
 * Form wiring, disabled state, `data-slot`, ref forwarding), and so does their
 * content, such as an affix or a clear button.
 *
 * A component does not read the flag for its chrome. `useSlots` gives the bare
 * output of its unit, and `ControlFrame`, `Shell`, and `TouchTarget` drop their
 * element.
 *
 * @returns `useHeadless()` reads the ambient flag; `false` outside any
 * `<HeadlessProvider>` (the configured default), so the hook is safe to call anywhere.
 * @see {@link HeadlessProvider}: the provider that sets the flag.
 */
export const [HeadlessContext, useHeadless] = createContext<boolean>('Headless', {
	default: false,
})
