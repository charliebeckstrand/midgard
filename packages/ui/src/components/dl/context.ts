'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

export type DlOrientation = Orientation

export const [DlContext, useDlOrientation] = createContext<DlOrientation>('Dl', {
	default: 'horizontal',
})
