'use client'

import type { ComponentProps } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useComposedRef, useScrollOverflow } from '../../hooks'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import {
	k,
	type ScrollAreaViewportVariants,
	type ScrollAreaWrapperVariants,
} from '../../recipes/kata/scroll-area'
import type { ScrollbarMode } from './types'
import { useScrollAreaScrollbar } from './use-scroll-area-scrollbar'

/** Props for {@link ScrollArea}: wrapper/viewport recipe variants, the `scrollbar` mode, and native `<div>` attributes. */
export type ScrollAreaProps = Omit<ScrollAreaWrapperVariants, 'orientation' | 'bare'> &
	Omit<ScrollAreaViewportVariants, 'orientation' | 'bare'> & {
		/** The axis that scrolls. @defaultValue 'vertical' */
		orientation?: ScrollAreaWrapperVariants['orientation']
		/** Whether the area drops the border of its frame and the padding of its viewport. @defaultValue false */
		bare?: ScrollAreaWrapperVariants['bare']
		/**
		 * Scrollbar visibility behavior.
		 * @defaultValue 'auto'
		 */
		scrollbar?: ScrollbarMode
		className?: string
	} & Omit<ComponentProps<'div'>, 'className'>

/**
 * Scrollable viewport with custom overlay scrollbars and draggable thumbs.
 * `scrollbar` toggles between `auto` (fade in while scrolling), `visible`, and
 * `hidden`. A horizontal viewport fades the edge with more content behind it.
 * The viewport is a keyboard tab stop only while its content
 * overflows. An `aria-label` or an `aria-labelledby` then names it as a
 * `role="region"`. A consumer `tabIndex` replaces that behavior.
 */
export function ScrollArea({
	orientation = 'vertical',
	extent,
	rounded,
	scrollbar = 'auto',
	bare,
	className,
	children,
	onScroll,
	ref,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	...props
}: ScrollAreaProps) {
	const {
		viewportRef,
		verticalTrackRef,
		horizontalTrackRef,
		verticalThumb,
		horizontalThumb,
		isScrolling,
		hasVertical,
		hasHorizontal,
		handleScroll,
		startDrag,
	} = useScrollAreaScrollbar({ orientation, scrollbar })

	// The viewport is a tab stop, and a named region, only while its content
	// overflows (axe scrollable-region-focusable). A static tab stop is a dead,
	// unnamed stop when the content fits.
	const scrollRegionRef = useScrollRegion({ label: ariaLabel, labelledBy: ariaLabelledby })

	// A consumer `tabIndex` turns the hook off, so the name then passes through
	// with the other consumer props, as the consumer set it.
	const consumerName =
		props.tabIndex === undefined
			? {}
			: { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }

	// A horizontal viewport fades the edge with more content behind it.
	const scrollOverflowRef = useScrollOverflow({
		axis: 'horizontal',
		enabled: orientation === 'horizontal',
	})

	// A consumer ref joins the viewport ref instead of replacing it (CONVENTIONS.md §3.9).
	const composedViewportRef = useComposedRef(viewportRef, scrollOverflowRef, scrollRegionRef, ref)

	const showScrollbar = scrollbar !== 'hidden'

	const scrollbarState: 'auto' | 'active' =
		scrollbar === 'visible' || isScrolling ? 'active' : 'auto'

	return (
		<div
			data-slot="scroll-area"
			data-orientation={orientation}
			className={cn(k.wrapper({ rounded, orientation, extent, bare }), className)}
		>
			{/* A consumer can set its own stop through props (e.g. tabIndex={-1}
			    with role="region" and aria-label). */}
			<div
				data-slot="scroll-area-viewport"
				ref={composedViewportRef}
				className={k.viewport({ orientation, bare })}
				// Thumb tracking and the auto-fade follow an event the browser cannot
				// cancel, so they run whatever the consumer does (CONVENTIONS.md §3.9).
				onScroll={composeEventHandlers(onScroll, handleScroll, {
					checkForDefaultPrevented: false,
				})}
				{...consumerName}
				{...props}
			>
				{children}
			</div>
			{hasVertical && showScrollbar && (
				<div
					ref={verticalTrackRef}
					data-slot="scroll-area-scrollbar"
					className={k.scrollbar({
						orientation: 'vertical',
						rounded: rounded ?? false,
						state: scrollbarState,
					})}
				>
					{verticalThumb.visible && (
						<div
							data-slot="scroll-area-thumb"
							className={k.thumb({ orientation: 'vertical' })}
							style={{
								height: `${verticalThumb.size}px`,
								transform: `translateY(${verticalThumb.offset}px)`,
							}}
							onPointerDown={startDrag('y')}
						/>
					)}
				</div>
			)}
			{hasHorizontal && showScrollbar && (
				<div
					ref={horizontalTrackRef}
					data-slot="scroll-area-scrollbar"
					className={k.scrollbar({
						orientation: 'horizontal',
						rounded: rounded ?? false,
						state: scrollbarState,
					})}
				>
					{horizontalThumb.visible && (
						<div
							data-slot="scroll-area-thumb"
							className={k.thumb({ orientation: 'horizontal' })}
							style={{
								width: `${horizontalThumb.size}px`,
								transform: `translateX(${horizontalThumb.offset}px)`,
							}}
							onPointerDown={startDrag('x')}
						/>
					)}
				</div>
			)}
		</div>
	)
}
