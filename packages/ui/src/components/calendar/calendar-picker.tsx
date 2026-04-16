'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks/use-keyboard'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { MONTHS } from './utilities'
import { k } from './variants'

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
	const [pickerView, setPickerView] = useState<'months' | 'years'>('months')

	const [internalOpen, setInternalOpen] = useState(false)

	const [pickerYear, setPickerYear] = useState(year)
	const [decadeYear, setDecadeYear] = useState(year)

	const decadeStart = Math.floor(decadeYear / 10) * 10

	const pickerHeaderRef = useRef<HTMLDivElement>(null)
	const pickerGridRef = useRef<HTMLDivElement>(null)

	const pickerOpen = openProp !== undefined ? openProp : internalOpen

	const setPickerOpen = useCallback(
		(value: boolean) => {
			if (openProp === undefined) setInternalOpen(value)
			onOpenChange?.(value)
		},
		[openProp, onOpenChange],
	)

	const headerRoving = useRovingFocus(pickerHeaderRef, {
		itemSelector: 'button',
		orientation: 'horizontal',
	})

	const gridRoving = useRovingFocus(pickerGridRef, {
		itemSelector: 'button',
		cols: 3,
	})

	const handleHeaderKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.stopPropagation()
				e.preventDefault()

				pickerGridRef.current?.querySelector<HTMLElement>('button')?.focus()

				return
			}

			headerRoving(e)

			if (e.defaultPrevented) e.stopPropagation()
		},
		[headerRoving],
	)

	const handleGridKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				const buttons = Array.from(
					pickerGridRef.current?.querySelectorAll<HTMLElement>('button') ?? [],
				)

				const index = buttons.indexOf(document.activeElement as HTMLElement)

				if (index >= 0 && index < 3) {
					e.preventDefault()
					e.stopPropagation()

					const headerButtons = Array.from(
						pickerHeaderRef.current?.querySelectorAll<HTMLElement>('button') ?? [],
					)

					headerButtons[Math.floor(headerButtons.length / 2)]?.focus()

					return
				}
			}

			gridRoving(e)

			if (e.defaultPrevented) e.stopPropagation()
		},
		[gridRoving],
	)

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

	return (
		<Popover placement="bottom" open={pickerOpen} onOpenChange={handlePickerOpen}>
			<PopoverTrigger>
				<Button variant="plain" className={triggerClassName}>
					{monthLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="min-w-64">
				{pickerView === 'months' ? (
					<>
						<div
							ref={pickerHeaderRef}
							role="toolbar"
							onKeyDown={handleHeaderKeyDown}
							className={k.header}
						>
							<Button
								variant="plain"
								onClick={() => setPickerYear((y) => y - 1)}
								aria-label="Previous year"
							>
								<ChevronLeft className={k.nav.icon} />
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
								<ChevronRight className={k.nav.icon} />
							</Button>
						</div>
						<div
							ref={pickerGridRef}
							role="listbox"
							onKeyDown={handleGridKeyDown}
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
						<div
							ref={pickerHeaderRef}
							role="toolbar"
							onKeyDown={handleHeaderKeyDown}
							className={k.header}
						>
							<Button
								variant="plain"
								onClick={() => setDecadeYear((y) => y - 10)}
								aria-label="Previous decade"
							>
								<ChevronLeft className={k.nav.icon} />
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
								<ChevronRight className={k.nav.icon} />
							</Button>
						</div>
						<div
							ref={pickerGridRef}
							role="listbox"
							onKeyDown={handleGridKeyDown}
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
