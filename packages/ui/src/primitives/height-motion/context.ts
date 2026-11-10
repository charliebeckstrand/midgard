'use client'

import { createContext } from '../../core/create-context'

/**
 * A box that travels its own height to the height of its content, such as a
 * `fit` drawer.
 *
 * The box travels when its content changes in one step. Content that moves its
 * own height, such as a panel that opens, already moves on each frame. A travel
 * on top of that motion would chase it, so the box follows that motion while it
 * runs.
 */
export type HeightMotionHost = {
	/**
	 * Tells the box that the content starts to move its own height. It returns
	 * the function that tells the box the motion ended. That function does
	 * nothing after its first call.
	 */
	move: () => () => void
}

/**
 * The box that encloses the reader, or `null` outside such a box. A panel that
 * animates its height tells the box when the motion starts and when it lands.
 *
 * @example
 * ```tsx
 * const host = useHeightMotionHost()
 *
 * const end = host?.move()
 *
 * // When the motion lands:
 * end?.()
 * ```
 */
export const [HeightMotionContext, useHeightMotionHost] = createContext<HeightMotionHost | null>(
	'HeightMotion',
	{ default: null },
)
