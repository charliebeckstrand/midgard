'use client'

import { createContext } from '../../core'
import type { Size } from '../../types'

/**
 * Broadcast of `<Input>`'s resolved size to its descendants — affix icons,
 * clear/loading buttons, spinners inside the input auto-scale. Pure downward
 * broadcast, no inheritance from outer ancestors. See `src/docs/CASCADES.md`.
 */
export const [InputSizeProvider, useInputSize] = createContext<Size | undefined>('InputSize', {
	default: undefined,
})
