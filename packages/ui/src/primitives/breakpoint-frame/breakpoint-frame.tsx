'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useMemo, useState } from 'react'
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
 * A frame value, and the ref callback that gives it its box. The value reads
 * the box at each call, so it works before the box exists. Until then, the
 * frame reads the viewport. @internal
 */
function createFrame(viewport: boolean, initial: HTMLElement | null = null) {
	let box = initial

	const listeners = new Set<() => void>()

	const frame: BreakpointFrameContextValue = {
		get element() {
			return box
		},
		viewport,
		subscribeElement: (callback) => {
			listeners.add(callback)

			return () => listeners.delete(callback)
		},
		subscribe: (callback) => {
			// React subscribes after the commit, when the box exists.
			if (box === null) return noop

			const observer = new ResizeObserver(callback)

			observer.observe(box)

			return () => observer.disconnect()
		},
		matches: (breakpoint) =>
			box === null
				? matchesMediaQuery(`(min-width: ${BREAKPOINT_WIDTHS[breakpoint]})`)
				: box.getBoundingClientRect().width >= breakpointPixels(breakpoint),
	}

	const attach = (node: HTMLElement | null) => {
		box = node

		for (const listener of listeners) listener()
	}

	return { frame, attach }
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
	// Each frame that is not a viewport keeps one value. A change of the value
	// re-renders all of the content, and React must hydrate each Suspense
	// boundary in the content before it can continue.
	const [stable] = useState(() => createFrame(false))

	// A viewport frame keeps the box in state, so its value changes once the
	// box exists, and its portals and overlays move into the box.
	const [element, setElement] = useState<HTMLDivElement | null>(null)

	const attachBox: (node: HTMLDivElement | null) => void = viewport ? setElement : stable.attach

	const composedRef = useComposedRefs(attachBox, ref)

	const viewportFrame = useMemo(
		() => (viewport ? createFrame(true, element).frame : null),
		[viewport, element],
	)

	const frame = viewportFrame ?? stable.frame

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
