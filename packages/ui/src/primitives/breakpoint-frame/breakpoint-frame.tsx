'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useMemo, useRef, useState } from 'react'
import { cn } from '../../core/cn'
import { matchesMediaQuery } from '../../utilities/media-query'
import { noop } from '../../utilities/noop'
import { BREAKPOINT_WIDTHS, type MinBreakpoint } from '../../utilities/responsive'
import { PortalContext } from '../portal/context'
import { BreakpointFrameContext, type BreakpointFrameContextValue } from './context'

/** The width of `breakpoint` in pixels. A container query reads `rem` at the root font size. */
function breakpointPixels(breakpoint: MinBreakpoint): number {
	const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)

	return Number.parseFloat(BREAKPOINT_WIDTHS[breakpoint]) * root
}

/**
 * The frame value of the box that `read` gives. Each call reads the box again,
 * so the value works before the box exists. Until then, the frame reads the
 * viewport. @internal
 */
function createFrame(
	read: () => HTMLElement | null,
	viewport: boolean,
): BreakpointFrameContextValue {
	return {
		get element() {
			return read()
		},
		viewport,
		subscribe: (callback) => {
			const element = read()

			// React subscribes after the commit, when the box exists.
			if (element === null) return noop

			const observer = new ResizeObserver(callback)

			observer.observe(element)

			return () => observer.disconnect()
		},
		matches: (breakpoint) => {
			const element = read()

			return element === null
				? matchesMediaQuery(`(min-width: ${BREAKPOINT_WIDTHS[breakpoint]})`)
				: element.getBoundingClientRect().width >= breakpointPixels(breakpoint)
		},
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
 * Before the box exists, the content reads the viewport. The content reads the
 * box after the first commit.
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
	const box = useRef<HTMLDivElement | null>(null)

	// A viewport frame keeps the box in state, so its value changes once the
	// box exists, and its portals and overlays move into the box. Each other
	// frame keeps one value. A change of the value re-renders all of the
	// content, and React must hydrate each Suspense boundary in the content
	// before it can continue.
	const [element, setElement] = useState<HTMLDivElement | null>(null)

	const composedRef = useComposedRefs(box, viewport ? setElement : undefined, ref)

	const frame = useMemo(
		() => createFrame(viewport ? () => element : () => box.current, viewport),
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
