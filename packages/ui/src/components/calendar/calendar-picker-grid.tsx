import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { Button } from '../button'
import { Icon } from '../icon'

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
	cells: CalendarPickerGridCell[]
	cellBlock?: boolean
	size: Step
}

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
	cells,
	cellBlock = false,
	size,
}: CalendarPickerGridProps) {
	return (
		<>
			<div
				ref={headerRef}
				role="toolbar"
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
				onKeyDown={onGridKeyDown}
				className={cn(k.picker.grid({ size }))}
			>
				{cells.map((cell) => (
					<Button
						key={cell.key}
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
