'use client'

import { createContext } from '../../core'
import type { Size } from '../../types'

/**
 * Size `<Input>` broadcasts to its affix descendants — icons, clear/loading
 * buttons, spinners rendered inside the input auto-scale. Pure downward
 * broadcast, no inheritance from outer ancestors. See `src/docs/CASCADES.md`.
 */
export const [AffixSizeProvider, useAffixSize] = createContext<Size | undefined>('AffixSize', {
	default: undefined,
})
