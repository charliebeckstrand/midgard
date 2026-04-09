'use client'

import { createContext, useContext } from 'react'

type TimelineOrientation = 'vertical' | 'horizontal'
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
