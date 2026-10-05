import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { KeyboardEventHandler, ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import { Icon } from '../icon'

type CalendarToolbarProps = {
	toolbarRef: RefObject<HTMLDivElement | null>
	onKeyDown: KeyboardEventHandler<HTMLElement>
	prevLabel: string
	nextLabel: string
	onPrev: () => void
	onNext: () => void
	/** Classes for the previous button, such as the roving-focus highlight. */
	prevClassName?: string
	/** Classes for the next button, such as the roving-focus highlight. */
	nextClassName?: string
	/** The center control between the two chevron buttons. */
	children: ReactNode
}

/**
 * Row of previous and next chevron buttons around a center control. The
 * controls are plain buttons, and each one is a Tab stop. The calendar header
 * and both views of the month/year picker render through it.
 *
 * @internal
 */
export function CalendarToolbar({
	toolbarRef,
	onKeyDown,
	prevLabel,
	nextLabel,
	onPrev,
	onNext,
	prevClassName,
	nextClassName,
	children,
}: CalendarToolbarProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a keydown delegation surface for the buttons in the row, not an interactive control. Each button is a Tab stop.
		<div ref={toolbarRef} onKeyDown={onKeyDown} className={cn(k.header)}>
			<Button
				type="button"
				variant="plain"
				onClick={onPrev}
				aria-label={prevLabel}
				prefix={<Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />}
				className={prevClassName}
			/>
			{children}
			<Button
				type="button"
				variant="plain"
				onClick={onNext}
				aria-label={nextLabel}
				prefix={<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />}
				className={nextClassName}
			/>
		</div>
	)
}
