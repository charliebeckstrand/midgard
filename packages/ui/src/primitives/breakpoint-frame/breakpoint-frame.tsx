'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useMemo, useState } from 'react'
import { cn } from '../../core/cn'
import { BREAKPOINT_WIDTHS, type MinBreakpoint } from '../../utilities/responsive'
import { PortalContext } from '../portal/context'
import { BreakpointFrameContext, type BreakpointFrameContextValue } from './context'

/** The width of `breakpoint` in pixels. A container query reads `rem` at the root font size. */
function breakpointPixels(breakpoint: MinBreakpoint): number {
	const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

	return Number.parseFloat(BREAKPOINT_WIDTHS[breakpoint]) * root
}

/** The frame value of `element`. @internal */
function createFrame(element: HTMLElement, viewport: boolean): BreakpointFrameContextValue {
	return {
		element,
		viewport,
		subscribe: (callback) => {
			const observer = new ResizeObserver(callback)

			observer.observe(element)

			return () => observer.disconnect()
		},
		matches: (breakpoint) => element.getBoundingClientRect().width >= breakpointPixels(breakpoint),
	}
}

/** Props for {@link BreakpointFrame}. @internal */
export type BreakpointFrameProps = ComponentProps<'div'> & {
	/**
	 * Makes the box also the viewport of the portals and the overlays of its
	 * content. Give the box a height.
	 * @defaultValue false
	 */
	viewport?: boolean
}

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
 * With `viewport`, the box also acts as the viewport for the portals and the
 * overlays of its content, as a window does for a page. Each portal with no
 * container of its own renders into the box, and an `Overlay` with no
 * `container` takes the box as its container. The box is thus the positioning
 * box of a fixed surface (`contain: layout`), and it clips what it holds. Its
 * content scrolls in a box of its own, so a surface in the box stays in place
 * while the content scrolls, as on a page. That box is a size container, so
 * `100cqh` in the content is the height of the frame, as `100svh` is the
 * height of a window. A layout, such as `SidebarLayout`, thus fills the frame.
 *
 * Before hydration, the content reads the viewport. The frame starts after the
 * first commit, when the box exists.
 *
 * @internal
 */
export function BreakpointFrame({
	viewport = false,
	className,
	children,
	ref,
	...props
}: BreakpointFrameProps) {
	// State, not a ref, so the frame starts once the box exists.
	const [element, setElement] = useState<HTMLDivElement | null>(null)

	const composedRef = useComposedRefs(setElement, ref)

	const frame = useMemo(
		() => (element === null ? null : createFrame(element, viewport)),
		[element, viewport],
	)

	return (
		<div
			ref={composedRef}
			data-slot="breakpoint-frame"
			className={cn(
				'@container/breakpoint-frame',
				viewport && 'relative overflow-hidden contain-layout',
				className,
			)}
			{...props}
		>
			<BreakpointFrameContext value={frame}>
				{viewport ? (
					<PortalContext value={element}>
						<div
							data-slot="breakpoint-frame-scroll"
							className="@container-size h-full overflow-auto"
						>
							{children}
						</div>
					</PortalContext>
				) : (
					children
				)}
			</BreakpointFrameContext>
		</div>
	)
}
