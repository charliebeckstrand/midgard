'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes'

export type SegmentContextValue = {
	size: Step
}

export const [SegmentProvider, useSegmentContext] = createContext<SegmentContextValue>('Segment')
