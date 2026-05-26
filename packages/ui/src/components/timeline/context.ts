'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

type TimelineOrientation = Orientation
type TimelineVariant = 'solid' | 'outline'

type TimelineContextValue = {
	orientation: TimelineOrientation
	variant: TimelineVariant
}

export const [TimelineContext, useTimeline] = createContext<TimelineContextValue>('Timeline', {
	default: { orientation: 'vertical', variant: 'solid' },
})

export type { TimelineOrientation, TimelineVariant }
