'use client'

import { createContext } from '../../core'
import type { Step } from '../../core/recipe'

export type SegmentContextValue = {
	size: Step
}

export const [SegmentProvider, useSegmentContext] = createContext<SegmentContextValue>('Segment')
