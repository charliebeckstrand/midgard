'use client'

import { createContext } from '../../core'
import type { Size } from '../../types'

export const [InputSizeProvider, useInputSize] = createContext<Size | undefined>('InputSize', {
	default: undefined,
})
