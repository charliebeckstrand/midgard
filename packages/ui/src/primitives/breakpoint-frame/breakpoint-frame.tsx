'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useMemo, useState } from 'react'
import { cn } from '../../core/cn'
import { BREAKPOINT_WIDTHS, type MinBreakpoint } from '../../utilities/responsive'
import { BreakpointFrameContext, type BreakpointFrameContextValue } from './context'

/** The width of `breakpoint` in pixels. A container query reads `rem` at the root font size. */
function breakpointPixels(breakpoint: MinBreakpoint): number {
	const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

	return Number.parseFloat(BREAKPOINT_WIDTHS[breakpoint]) * root
}

/** The frame value of `element`. @internal */
function createFrame(element: HTMLElement): BreakpointFrameContextValue {
	return {
		element,
		subscribe: (callback) => {
			const observer = new ResizeObserver(callback)

			observer.observe(element)

			return () => observer.disconnect()
		},
		matches: (breakpoint) => element.getBoundingClientRect().width >= breakpointPixels(breakpoint),
	}
}

/** Props for {@link BreakpointFrame}. @internal */
export type BreakpointFrameProps = ComponentProps<'div'>

/**
 * A box that acts as the viewport for the breakpoints of its content. Each
 * `useResponsiveValue` in the box reads the width of the box, and not the
 * width of the viewport. The box is also the inline-size container
 * `breakpoint-frame`. A stylesheet that changes the breakpoint variants to
 * that container query thus moves the CSS with the JavaScript. The docs do
 * this in `app.css`, so an example responds to the width of its frame as a
 * page responds to the width of a window.
 *
 * Give the box no padding and no border. A container query reads the width of
 * the content box, and the frame measures the full box.
 *
 * A surface that a portal moves out of the box reads the viewport again.
 *
 * Before hydration, the content reads the viewport. The frame starts after the
 * first commit, when the box exists.
 *
 * @internal
 */
export function BreakpointFrame({ className, children, ref, ...props }: BreakpointFrameProps) {
	// State, not a ref, so the frame starts once the box exists.
	const [element, setElement] = useState<HTMLDivElement | null>(null)

	const composedRef = useComposedRefs(setElement, ref)

	const frame = useMemo(() => (element === null ? null : createFrame(element)), [element])

	return (
		<div
			ref={composedRef}
			data-slot="breakpoint-frame"
			className={cn('@container/breakpoint-frame', className)}
			{...props}
		>
			<BreakpointFrameContext value={frame}>{children}</BreakpointFrameContext>
		</div>
	)
}
