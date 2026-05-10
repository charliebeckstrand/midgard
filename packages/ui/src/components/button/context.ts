'use client'

import { createContext } from '../../core'
import type { Size } from '../../types'

export const [ButtonSizeProvider, useButtonSize] = createContext<Size | undefined>('ButtonSize', {
	default: undefined,
})
