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
			<div
				data-slot="scroll-area-viewport"
				ref={viewportRef}
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
