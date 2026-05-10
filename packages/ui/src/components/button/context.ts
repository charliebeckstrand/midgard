'use client'

import { createContext } from '../../core'
import type { Size } from '../../types'

/**
 * Broadcast of `<Button>`'s resolved size to its descendants — Spinner / Icon
 * placed inside the button auto-scale to match. Pure downward broadcast, no
 * inheritance from outer ancestors. See `src/CASCADES.md`.
 */
export const [ButtonSizeProvider, useButtonSize] = createContext<Size | undefined>('ButtonSize', {
	default: undefined,
})
