import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import { Icon } from '../icon'

/**
 * One `role="option"` cell in a picker grid (a month or a year). `selected`
 * marks the active choice; `current` marks today's month/year for the
 * `aria-current` ring.
 */
export type CalendarPickerGridCell = {
	key: string | number
	label: ReactNode
	selected: boolean
	current: boolean
	onSelect: () => void
}

type CalendarPickerGridProps = {
	headerRef: RefObject<HTMLDivElement | null>
	gridRef: RefObject<HTMLDivElement | null>
	onHeaderKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	onGridKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	prevLabel: string
	nextLabel: string
	centerLabel: ReactNode
	onPrev: () => void
	onNext: () => void
	onCenter: () => void
	gridLabel: string
	cells: CalendarPickerGridCell[]
	/** Renders cells full-width (`block`); the month grid sets this, the year grid does not. */
	cellBlock?: boolean
	size: Step
}

/**
 * View-agnostic picker layout: a `role="toolbar"` row (prev / center / next)
 * over a `role="listbox"` cell grid. Both the month and year views render
 * through it; the caller supplies labels, handlers, and cells per view.
 *
 * @internal
 */
export function CalendarPickerGrid({
	headerRef,
	gridRef,
	onHeaderKeyDown,
	onGridKeyDown,
	prevLabel,
	nextLabel,
	centerLabel,
	onPrev,
	onNext,
	onCenter,
	gridLabel,
	cells,
	cellBlock = false,
	size,
}: CalendarPickerGridProps) {
	return (
		<>
			<div
				ref={headerRef}
				role="toolbar"
				aria-label="Calendar navigation"
				onKeyDown={onHeaderKeyDown}
				className={cn(k.header({ size }))}
			>
				<Button
					variant="plain"
					onClick={onPrev}
					aria-label={prevLabel}
					prefix={<Icon icon={<ChevronLeft />} />}
				/>
				<Button variant="plain" onClick={onCenter}>
					{centerLabel}
				</Button>
				<Button
					variant="plain"
					onClick={onNext}
					aria-label={nextLabel}
					prefix={<Icon icon={<ChevronRight />} />}
				/>
			</div>
			<div
				ref={gridRef}
				role="listbox"
				aria-label={gridLabel}
				onKeyDown={onGridKeyDown}
				className={cn(k.picker.grid({ size }))}
			>
				{cells.map((cell) => (
					<Button
						key={cell.key}
						role="option"
						aria-selected={cell.selected}
						aria-current={cell.current ? true : undefined}
						variant={cell.selected ? 'solid' : 'plain'}
						data-selected={cell.selected || undefined}
						block={cellBlock}
						onClick={cell.onSelect}
						className={cn(cell.current && !cell.selected && k.picker.cellCurrent)}
					>
						{cell.label}
					</Button>
				))}
			</div>
		</>
	)
}
