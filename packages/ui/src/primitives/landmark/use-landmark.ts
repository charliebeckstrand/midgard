'use client'

import { useLandmarkContext } from './context'

/**
 * Tells which landmark of the page holds the caller.
 *
 * @remarks
 * A layout inside the main landmark of another layout is content of that
 * landmark. A landmark that such a layout owns for the page does not apply
 * there. {@link Landmark} reads this hook for the landmarks that it renders. An
 * app reads it for a landmark of its own.
 *
 * @returns `'main'` inside a main `Landmark`, and `null` outside one.
 */
export function useLandmark(): 'main' | null {
	return useLandmarkContext()
}
