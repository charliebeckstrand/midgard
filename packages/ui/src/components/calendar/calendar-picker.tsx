'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useResolvedSize } from '../../primitives/concentric'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { CalendarPickerGrid, type CalendarPickerGridCell } from './calendar-picker-grid'
import { MONTHS } from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'

type CalendarPickerProps = {
	year: number
	month: number
	today: Date
	onNavigate: (year: number, month: number) => void
	monthLabel: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
	triggerClassName?: string
}

export function CalendarPicker({
	year,
	month,
	today,
	onNavigate,
	monthLabel,
	open: openProp,
	onOpenChange,
	triggerClassName,
}: CalendarPickerProps) {
	const size = useResolvedSize()

	const [pickerView, setPickerView] = useState<'months' | 'years'>('months')

	const handleOpenChange = useCallback(
		(value: boolean | undefined) => {
			if (value !== undefined) onOpenChange?.(value)
		},
		[onOpenChange],
	)

	const [pickerOpen, setPickerOpen] = useControllable({
		value: openProp,
		defaultValue: false,
		onChange: handleOpenChange,
	})

	const [pickerYear, setPickerYear] = useState(year)
	const [decadeYear, setDecadeYear] = useState(year)

	const decadeStart = Math.floor(decadeYear / 10) * 10

	const pickerHeaderRef = useRef<HTMLDivElement>(null)
	const pickerGridRef = useRef<HTMLDivElement>(null)

	const { handleHeaderKeyDown, handleGridKeyDown } = useCalendarFocus({
		headerRef: pickerHeaderRef,
		gridRef: pickerGridRef,
		cols: 3,
		stopPropagation: true,
	})

	const focusPickerGrid = useCallback(() => {
		requestAnimationFrame(() => {
			const grid = pickerGridRef.current

			if (!grid) return

			const selected = grid.querySelector<HTMLElement>('[data-selected]')

			;(selected ?? grid.querySelector<HTMLElement>('button'))?.focus()
		})
	}, [])

	useEffect(() => {
		if (!pickerOpen) return

		focusPickerGrid()
	}, [pickerOpen, focusPickerGrid])

	const handlePickerOpen = useCallback(
		(open: boolean) => {
			setPickerOpen(open)

			if (open) {
				setPickerYear(year)

				setDecadeYear(year)

				setPickerView('months')
			}
		},
		[year, setPickerOpen],
	)

	const selectMonth = useCallback(
		(m: number) => {
			onNavigate(pickerYear, m)

			setPickerOpen(false)
		},
		[pickerYear, onNavigate, setPickerOpen],
	)

	const monthCells: CalendarPickerGridCell[] = MONTHS.map((label, i) => ({
		key: label,
		label,
		selected: i === month && pickerYear === year,
		current: i === today.getMonth() && pickerYear === today.getFullYear(),
		onSelect: () => selectMonth(i),
	}))

	const yearCells: CalendarPickerGridCell[] = Array.from({ length: 12 }, (_, i) => {
		const y = decadeStart - 1 + i

		return {
			key: y,
			label: y,
			selected: y === year,
			current: y === today.getFullYear(),
			onSelect: () => {
				setPickerYear(y)

				setPickerView('months')

				focusPickerGrid()
			},
		}
	})

	const viewConfig =
		pickerView === 'months'
			? {
					prevLabel: 'Previous year',
					nextLabel: 'Next year',
					centerLabel: pickerYear,
					onPrev: () => setPickerYear((y) => y - 1),
					onNext: () => setPickerYear((y) => y + 1),
					onCenter: () => {
						setDecadeYear(pickerYear)

						setPickerView('years')

						focusPickerGrid()
					},
					cells: monthCells,
					cellBlock: true,
				}
			: {
					prevLabel: 'Previous decade',
					nextLabel: 'Next decade',
					centerLabel: (
						<>
							{decadeStart}&ndash;{decadeStart + 9}
						</>
					),
					onPrev: () => setDecadeYear((y) => y - 10),
					onNext: () => setDecadeYear((y) => y + 10),
					onCenter: () => {
						setPickerView('months')

						focusPickerGrid()
					},
					cells: yearCells,
					cellBlock: false,
				}

	return (
		<Popover placement="bottom" open={pickerOpen} onOpenChange={handlePickerOpen}>
			<PopoverTrigger>
				<Button variant="plain" className={triggerClassName}>
					{monthLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<CalendarPickerGrid
					headerRef={pickerHeaderRef}
					gridRef={pickerGridRef}
					onHeaderKeyDown={handleHeaderKeyDown}
					onGridKeyDown={handleGridKeyDown}
					{...viewConfig}
					size={size}
				/>
			</PopoverContent>
		</Popover>
	)
}
