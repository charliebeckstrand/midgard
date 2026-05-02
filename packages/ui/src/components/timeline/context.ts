'use client'

import { createContext, useContext } from 'react'
import type { Orientation } from '../../types'

type TimelineOrientation = Orientation
type TimelineVariant = 'solid' | 'outline'

type TimelineContextValue = {
	orientation: TimelineOrientation
	variant: TimelineVariant
}

const TimelineContext = createContext<TimelineContextValue>({
	orientation: 'vertical',
	variant: 'solid',
})

export const TimelineProvider = TimelineContext.Provider

export function useTimeline(): TimelineContextValue {
	return useContext(TimelineContext)
}

export type { TimelineOrientation, TimelineVariant }
