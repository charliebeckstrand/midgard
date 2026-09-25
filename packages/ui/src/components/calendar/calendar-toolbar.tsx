import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { KeyboardEventHandler, ReactNode, RefObject } from 'react'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import { Icon } from '../icon'

type CalendarToolbarProps = {
	toolbarRef: RefObject<HTMLDivElement | null>
	/** Accessible name of the `role="toolbar"` row. */
	label: string
	onKeyDown: KeyboardEventHandler<HTMLElement>
	size: Step
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
 * `role="toolbar"` row of previous and next chevron buttons around a center
 * control. The calendar header and both views of the month/year picker render
 * through it.
 *
 * @internal
 */
export function CalendarToolbar({
	toolbarRef,
	label,
	onKeyDown,
	size,
	prevLabel,
	nextLabel,
	onPrev,
	onNext,
	prevClassName,
	nextClassName,
	children,
}: CalendarToolbarProps) {
	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label={label}
			onKeyDown={onKeyDown}
			className={k.header({ size })}
		>
			<Button
				type="button"
				variant="plain"
				onClick={onPrev}
				aria-label={prevLabel}
				prefix={<Icon icon={<ChevronLeft />} />}
				className={prevClassName}
			/>
			{children}
			<Button
				type="button"
				variant="plain"
				onClick={onNext}
				aria-label={nextLabel}
				prefix={<Icon icon={<ChevronRight />} />}
				className={nextClassName}
			/>
		</div>
	)
}
