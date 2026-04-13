'use client'

import { createContext, useContext } from 'react'

type SegmentedControlContext = {
	value: string | undefined
	onSelect: (value: string) => void
	size: 'sm' | 'md' | 'lg'
}

const SegmentedControlContext = createContext<SegmentedControlContext | undefined>(undefined)

export const SegmentedControlProvider = SegmentedControlContext.Provider

export function useSegmentedControl() {
	const ctx = useContext(SegmentedControlContext)

	if (!ctx) {
		throw new Error('Segment must be used within a SegmentedControl')
	}

	return ctx
}
