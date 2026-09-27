'use client'

import { REDUCED_MOTION_QUERY } from '../utilities/media-query'
import { useMediaQuery } from './use-media-query'

/**
 * Whether the reader asks the platform for reduced motion. The value is live:
 * a change to the setting during the session renders the caller again.
 *
 * @remarks
 * Use this hook, not the `useReducedMotion` hook of motion. That hook reads the
 * setting one time at mount and does not update. A caller that waits for a
 * `transitionend` can then wait forever, because the CSS stops the transition
 * when the reader turns reduced motion on.
 *
 * The value is `true` on the server and in the hydration render, which is the
 * safe default for motion.
 *
 * @returns `true` when the reader asks for reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
	return useMediaQuery(REDUCED_MOTION_QUERY)
}
