'use client'

import { createContext } from '../../core'

/**
 * Ambient flag: true inside `<Headless>`. Headless-aware components (Input,
 * Button) drop their chrome and render the bare semantic element when set,
 * keeping the rest of their behavior (Control / Form wiring, disabled state,
 * `data-slot`, ref forwarding).
 */
export const [HeadlessContext, useHeadless] = createContext<boolean>('Headless', {
	default: false,
})
