'use client'

import { use } from 'react'
import { ReducedMotionContext } from '../primitives/reduced-motion/context'
import { REDUCED_MOTION_QUERY } from '../utilities/media-query'
import { useMediaQuery } from './use-media-query'

/**
 * Whether the reader asks for reduced motion: through the platform setting, or
 * through the Motion setting of `AppearanceProvider`. The value is live: a
 * change to either setting during the session renders the caller again.
 *
 * @remarks
 * Use this hook, not the `useReducedMotion` hook of motion. That hook reads the
 * platform setting one time at mount and does not update. A caller that waits
 * for a `transitionend` can then wait forever, because the CSS stops the
 * transition when the reader turns reduced motion on.
 *
 * The value is `true` on the server and in the hydration render, which is the
 * safe default for motion.
 *
 * @returns `true` when the reader asks for reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
	const setting = use(ReducedMotionContext)

	const platform = useMediaQuery(REDUCED_MOTION_QUERY)

	return setting || platform
}
