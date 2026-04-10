'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { MONTHS } from './calendar-utilities'
import { useKeyboard } from './use-keyboard'

const k = katachi.calendar

type CalendarPickerProps = {
	year: number
	month: number
	today: Date
	onNavigate: (year: number, month: number) => void
	monthLabel: string
}

export function CalendarPicker({
	year,
	month,
	today,
	onNavigate,
	monthLabel,
}: CalendarPickerProps) {
	const [pickerView, setPickerView] = useState<'months' | 'years'>('months')
	const [pickerOpen, setPickerOpen] = useState(false)
	const [pickerYear, setPickerYear] = useState(year)
	const [decadeYear, setDecadeYear] = useState(year)

	const decadeStart = Math.floor(decadeYear / 10) * 10

	const pickerGridRef = useRef<HTMLDivElement>(null)

	const handlePickerKeyDown = useKeyboard(pickerGridRef)

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
		[year],
	)

	const selectMonth = useCallback(
		(m: number) => {
			onNavigate(pickerYear, m)

			setPickerOpen(false)
		},
		[pickerYear, onNavigate],
	)

	return (
		<Popover placement="bottom" open={pickerOpen} onOpenChange={handlePickerOpen}>
			<PopoverTrigger>
				<Button variant="plain">{monthLabel}</Button>
			</PopoverTrigger>
			<PopoverContent className="min-w-64">
				{pickerView === 'months' ? (
					<>
						<div className={k.header}>
							<Button
								variant="plain"
								onClick={() => setPickerYear((y) => y - 1)}
								aria-label="Previous year"
							>
								<ChevronLeft className={k.navIcon} />
							</Button>
							<Button
								variant="plain"
								onClick={() => {
									setDecadeYear(pickerYear)

									setPickerView('years')

									focusPickerGrid()
								}}
							>
								{pickerYear}
							</Button>
							<Button
								variant="plain"
								onClick={() => setPickerYear((y) => y + 1)}
								aria-label="Next year"
							>
								<ChevronRight className={k.navIcon} />
							</Button>
						</div>
						<div
							ref={pickerGridRef}
							role="listbox"
							onKeyDown={handlePickerKeyDown}
							className={k.picker.grid}
						>
							{MONTHS.map((label, i) => {
								const isCurrent = i === today.getMonth() && pickerYear === today.getFullYear()

								const isSelected = i === month && pickerYear === year

								return (
									<Button
										key={label}
										variant={isSelected ? 'solid' : 'plain'}
										data-selected={isSelected || undefined}
										onClick={() => selectMonth(i)}
										className={cn(isCurrent && !isSelected && k.picker.cellCurrent)}
									>
										{label}
									</Button>
								)
							})}
						</div>
					</>
				) : (
					<>
						<div className={k.header}>
							<Button
								variant="plain"
								onClick={() => setDecadeYear((y) => y - 10)}
								aria-label="Previous decade"
							>
								<ChevronLeft className={k.navIcon} />
							</Button>
							<Button
								variant="plain"
								onClick={() => {
									setPickerView('months')

									focusPickerGrid()
								}}
							>
								{decadeStart}&ndash;{decadeStart + 9}
							</Button>
							<Button
								variant="plain"
								onClick={() => setDecadeYear((y) => y + 10)}
								aria-label="Next decade"
							>
								<ChevronRight className={k.navIcon} />
							</Button>
						</div>
						<div
							ref={pickerGridRef}
							role="listbox"
							onKeyDown={handlePickerKeyDown}
							className={k.picker.grid}
						>
							{Array.from({ length: 12 }, (_, i) => {
								const y = decadeStart - 1 + i

								const isCurrent = y === today.getFullYear()

								const isSelected = y === year

								return (
									<Button
										key={y}
										variant={isSelected ? 'solid' : 'plain'}
										data-selected={isSelected || undefined}
										onClick={() => {
											setPickerYear(y)

											setPickerView('months')

											focusPickerGrid()
										}}
										className={cn(isCurrent && !isSelected && k.picker.cellCurrent)}
									>
										{y}
									</Button>
								)
							})}
						</div>
					</>
				)}
			</PopoverContent>
		</Popover>
	)
}
