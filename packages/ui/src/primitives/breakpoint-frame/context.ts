'use client'

import { createContext } from '../../core/create-context'
import type { MinBreakpoint } from '../../utilities/responsive'

/**
 * A box that the breakpoints of `useResponsiveValue` read in place of the
 * viewport. {@link BreakpointFrame} provides it.
 *
 * @internal
 */
export type BreakpointFrameContextValue = {
	/** The element of the frame. A portal into this element stays in the frame. */
	element: HTMLElement
	/** Calls `callback` when the width of the frame changes, and gives the unsubscribe. */
	subscribe: (callback: () => void) => () => void
	/** Whether the frame is at least as wide as `breakpoint`. */
	matches: (breakpoint: MinBreakpoint) => boolean
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
	return frame !== null && node !== null && frame.element.contains(node) ? frame : null
}
