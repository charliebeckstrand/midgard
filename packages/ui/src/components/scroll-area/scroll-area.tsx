'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import {
	k,
	type ScrollAreaViewportVariants,
	type ScrollAreaWrapperVariants,
} from '../../recipes/kata/scroll-area'
import type { ScrollbarMode } from './types'
import { useScrollAreaScrollbar } from './use-scroll-area-scrollbar'

export type ScrollAreaProps = ScrollAreaWrapperVariants &
	ScrollAreaViewportVariants & {
		scrollbar?: ScrollbarMode
		className?: string
	} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Scrollable viewport with custom overlay scrollbars and draggable thumbs —
 * `scrollbar` toggles between `auto` (fade in while scrolling), `visible`, and
 * `hidden`. The viewport becomes keyboard-focusable only while actually
 * scrollable.
 */
export function ScrollArea({
	orientation = 'vertical',
	size,
	rounded,
	scrollbar = 'auto',
	bare,
	className,
	children,
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
	} = useScrollAreaScrollbar({ orientation: orientation ?? 'vertical', scrollbar })

	const showScrollbar = scrollbar !== 'hidden'

	const scrollbarState: 'auto' | 'active' =
		scrollbar === 'visible' || isScrolling ? 'active' : 'auto'

	return (
		<div
			data-slot="scroll-area"
			className={cn(k.wrapper({ rounded, orientation, size, bare }), className)}
		>
			{/* A scrollable region must be keyboard-reachable so it can be scrolled
			    when its content holds no focusable elements (axe
			    scrollable-region-focusable). Focusable only while actually scrollable,
			    so static viewports add no tab stop; consumers can override via props
			    (e.g. tabIndex={-1} with role="region" + aria-label to name it). */}
			<div
				data-slot="scroll-area-viewport"
				ref={viewportRef}
				tabIndex={hasVertical || hasHorizontal ? 0 : undefined}
				className={k.viewport({ orientation, bare })}
				onScroll={handleScroll}
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
								top: `${verticalThumb.offset}px`,
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
								left: `${horizontalThumb.offset}px`,
							}}
							onPointerDown={startDrag('x')}
						/>
					)}
				</div>
			)}
		</div>
	)
}
