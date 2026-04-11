'use client'

import { cn } from '../../core'
import { useScrollbar } from './use-scrollbar'
import type { ScrollbarMode } from './utilities'
import {
	type ScrollAreaViewportVariants,
	type ScrollAreaWrapperVariants,
	scrollAreaScrollbarVariants,
	scrollAreaThumbVariants,
	scrollAreaViewportVariants,
	scrollAreaWrapperVariants,
} from './variants'

export type ScrollAreaProps = ScrollAreaWrapperVariants &
	ScrollAreaViewportVariants & {
		scrollbar?: ScrollbarMode
		className?: string
	} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

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
	} = useScrollbar({ orientation: orientation ?? 'vertical', scrollbar })

	const showScrollbar = scrollbar !== 'hidden'
	const scrollbarState: 'auto' | 'active' =
		scrollbar === 'visible' || isScrolling ? 'active' : 'auto'

	return (
		<div
			data-slot="scroll-area"
			className={cn(scrollAreaWrapperVariants({ rounded, orientation, size, bare }), className)}
		>
			<div
				data-slot="scroll-area-viewport"
				ref={viewportRef}
				className={scrollAreaViewportVariants({ orientation, bare })}
				onScroll={handleScroll}
				{...props}
			>
				{children}
			</div>
			{hasVertical && showScrollbar && (
				<div
					ref={verticalTrackRef}
					data-slot="scroll-area-scrollbar"
					className={scrollAreaScrollbarVariants({
						orientation: 'vertical',
						rounded: rounded ?? false,
						state: scrollbarState,
					})}
				>
					{verticalThumb.visible && (
						<div
							data-slot="scroll-area-thumb"
							className={scrollAreaThumbVariants({ orientation: 'vertical' })}
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
					className={scrollAreaScrollbarVariants({
						orientation: 'horizontal',
						rounded: rounded ?? false,
						state: scrollbarState,
					})}
				>
					{horizontalThumb.visible && (
						<div
							data-slot="scroll-area-thumb"
							className={scrollAreaThumbVariants({ orientation: 'horizontal' })}
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
