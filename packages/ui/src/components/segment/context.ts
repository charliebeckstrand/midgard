'use client'

import { createContext, useContext } from 'react'

export type SegmentContextValue = {
	size: 'sm' | 'md' | 'lg'
}

const SegmentContext = createContext<SegmentContextValue | undefined>(undefined)

export const SegmentProvider = SegmentContext.Provider

export function useSegmentContext() {
	const ctx = useContext(SegmentContext)

	if (!ctx) {
		throw new Error('Segment components must be used within a Segment')
	}

	return ctx
}
