'use client'

import type { ComponentProps } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useComposedRef } from '../../hooks'
import {
	k,
	type ScrollAreaViewportVariants,
	type ScrollAreaWrapperVariants,
} from '../../recipes/kata/scroll-area'
import type { ScrollbarMode } from './types'
import { useScrollAreaScrollbar } from './use-scroll-area-scrollbar'

/** Props for {@link ScrollArea}: wrapper/viewport recipe variants, the `scrollbar` mode, and native `<div>` attributes. */
export type ScrollAreaProps = ScrollAreaWrapperVariants &
	ScrollAreaViewportVariants & {
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
 * `hidden`. The viewport is keyboard-focusable on every axis its `orientation`
 * enables.
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

	// A consumer ref joins the viewport ref instead of replacing it (CONVENTIONS.md §3.9).
	const composedViewportRef = useComposedRef(viewportRef, ref)

	const showScrollbar = scrollbar !== 'hidden'

	const scrollbarState: 'auto' | 'active' =
		scrollbar === 'visible' || isScrolling ? 'active' : 'auto'

	return (
		<div
			data-slot="scroll-area"
			data-orientation={orientation}
			className={cn(k.wrapper({ rounded, orientation, extent, bare }), className)}
		>
			{/* Keyboard-focusable on any enabled axis (axe scrollable-region-focusable).
			    tabIndex is omitted when no axis is enabled; consumers can override
			    via props (e.g. tabIndex={-1} with role="region" + aria-label). */}
			<div
				data-slot="scroll-area-viewport"
				ref={composedViewportRef}
				tabIndex={hasVertical || hasHorizontal ? 0 : undefined}
				className={k.viewport({ orientation, bare })}
				// Thumb tracking and the auto-fade follow an event the browser cannot
				// cancel, so they run whatever the consumer does (CONVENTIONS.md §3.9).
				onScroll={composeEventHandlers(onScroll, handleScroll, {
					checkForDefaultPrevented: false,
				})}
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
