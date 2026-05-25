'use client'

import { createContext } from '../../core'
import type { Step } from '../../recipes'

export type SegmentContextValue = {
	size: Step
}

export const [SegmentContext, useSegmentContext] = createContext<SegmentContextValue>('Segment')
