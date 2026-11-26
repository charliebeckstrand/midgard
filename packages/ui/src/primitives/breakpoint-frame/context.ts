'use client'

import { useLayoutEffect, useReducer } from 'react'
import { createContext } from '../../core/create-context'
import type { MinBreakpoint } from '../../utilities/responsive'

/**
 * A box that the breakpoints of `useResponsiveValue` read in place of the
 * viewport. {@link BreakpointFrame} provides it.
 *
 * @internal
 */
export type BreakpointFrameContextValue = {
	/**
	 * The element of the frame, or `null` before it mounts. A portal into this
	 * element stays in the frame.
	 */
	element: HTMLElement | null
	/** Calls `callback` when the width of the frame changes, and gives the unsubscribe. */
	subscribe: (callback: () => void) => () => void
	/** Whether the frame is at least as wide as `breakpoint`. */
	matches: (breakpoint: MinBreakpoint) => boolean
	/**
	 * Whether the frame is also the viewport of the portals and the overlays of
	 * its content (`viewport` on {@link BreakpointFrame}).
	 */
	viewport: boolean
}

/**
 * The nearest breakpoint frame, or `null` outside each frame. Outside a frame,
 * the breakpoints read the viewport.
 *
 * @internal
 */
export const [BreakpointFrameContext, useBreakpointFrame] =
	createContext<BreakpointFrameContextValue | null>('BreakpointFrame', { default: null })

/**
 * The nearest breakpoint frame, for a component that reads its element. The
 * value of a frame does not change when its box mounts. A component that
 * mounts in the same commit as the box thus renders again once the box
 * exists, before the paint.
 *
 * @returns The frame, or `null` outside each frame.
 *
 * @internal
 */
export function useMountedBreakpointFrame(): BreakpointFrameContextValue | null {
	const frame = useBreakpointFrame()

	const [, update] = useReducer((count: number) => count + 1, 0)

	// React attaches the ref of the box after the layout effects of its content.
	useLayoutEffect(() => {
		if (frame?.element === null) update()
	}, [frame])

	return frame
}

/**
 * The frame that holds `node`: `frame` when `node` is in its element, else
 * `null`. A surface that a portal moves out of the frame reads the viewport,
 * as its CSS does.
 *
 * @param frame - The frame of the place that renders the portal.
 * @param node - The node that the portal renders into, or `null` for the body.
 * @returns The frame, or `null` for the viewport.
 *
 * @internal
 */
export function findFrame(
	frame: BreakpointFrameContextValue | null,
	node: Node | null,
): BreakpointFrameContextValue | null {
	return node !== null && frame?.element?.contains(node) ? frame : null
}
