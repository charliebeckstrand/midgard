'use client'

import { useState } from 'react'

/**
 * Whether a legend toggle has changed the {@link sliceLayout} since mount.
 * After that, a label fades in when the {@link SLICE_MORPH} ends, not when the
 * sweep uncovers its slice. @internal
 */
export function useSliceReflowed(layout: string): boolean {
	const [held, setHeld] = useState({ layout, reflowed: false })

	// A set during render replaces this render at once.
	if (held.layout !== layout) setHeld({ layout, reflowed: true })

	return held.reflowed || held.layout !== layout
}
