'use client'

import { createContext } from '../../core/create-context'

/**
 * The landmark of the page that holds an element: `'main'` inside a main
 * {@link Landmark}, and `null` outside one.
 *
 * @internal
 */
export const [LandmarkContext, useLandmarkContext] = createContext<'main' | null>('Landmark', {
	default: null,
})
