import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, type RefObject, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/calendar'
import type { Step } from '../../recipes/ryu/sun'
import { Button } from '../button'
import { Icon } from '../icon'

export type CalendarPickerGridCell = {
	key: string | number
	label: ReactNode
	selected: boolean
	current: boolean
	onSelect: () => void
}

export type CalendarPickerGridProps = {
	headerRef: RefObject<HTMLDivElement | null>
	gridRef: RefObject<HTMLTableElement | null>
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
	gridLabel: string
	toolbarLabel: string
}

const PICKER_COLS = 3

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
	gridLabel,
	toolbarLabel,
}: CalendarPickerGridProps) {
	const rows = useMemo(() => {
		const result: CalendarPickerGridCell[][] = []

		for (let i = 0; i < cells.length; i += PICKER_COLS) {
			result.push(cells.slice(i, i + PICKER_COLS))
		}

		return result
	}, [cells])

	return (
		<>
			<div
				ref={headerRef}
				role="toolbar"
				aria-label={toolbarLabel}
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
			<table
				ref={gridRef}
				aria-label={gridLabel}
				onKeyDown={onGridKeyDown}
				className={cn(k.picker.grid({ size }))}
			>
				<tbody className="contents">
					{rows.map((row) => (
						<tr key={String(row[0]?.key)} className="contents">
							{row.map((cell) => (
								<td key={cell.key} className="contents">
									<Button
										variant={cell.selected ? 'solid' : 'plain'}
										aria-pressed={cell.selected}
										data-selected={cell.selected || undefined}
										block={cellBlock}
										onClick={cell.onSelect}
										className={cn(cell.current && !cell.selected && k.picker.cellCurrent)}
									>
										{cell.label}
									</Button>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</>
	)
}
