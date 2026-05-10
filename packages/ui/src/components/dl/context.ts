'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

export type DlOrientation = Orientation

export const [DlProvider, useDlOrientation] = createContext<DlOrientation>('Dl', {
	default: 'horizontal',
})
