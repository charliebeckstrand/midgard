'use client'

import { createContext } from '../../core'

export type SegmentContextValue = {
	size: 'sm' | 'md' | 'lg'
}

export const [SegmentProvider, useSegmentContext] = createContext<SegmentContextValue>('Segment')
