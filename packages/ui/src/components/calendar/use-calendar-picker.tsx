'use client'

import {
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useReducer,
	useRef,
} from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { MONTHS } from './calendar-constants'
import type { CalendarPickerGridCell } from './calendar-picker-grid'
import { calendarPickerReducer, initialCalendarPickerState } from './calendar-picker-reducer'
import { useCalendarFocus } from './use-calendar-focus'

export type UseCalendarPickerOptions = {
	year: number
	month: number
	today: Date
	onNavigate: (year: number, month: number) => void
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export type CalendarPickerViewConfig = {
	prevLabel: string
	nextLabel: string
	centerLabel: ReactNode
	onPrev: () => void
	onNext: () => void
	onCenter: () => void
	cells: CalendarPickerGridCell[]
	cellBlock: boolean
	gridLabel: string
	toolbarLabel: string
}

export type UseCalendarPickerResult = {
	pickerOpen: boolean | undefined
	handlePickerOpen: (open: boolean) => void
	pickerHeaderRef: RefObject<HTMLDivElement | null>
	pickerGridRef: RefObject<HTMLTableElement | null>
	handleHeaderKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	handleGridKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	viewConfig: CalendarPickerViewConfig
}

export function useCalendarPicker({
	year,
	month,
	today,
	onNavigate,
	open: openProp,
	onOpenChange,
}: UseCalendarPickerOptions): UseCalendarPickerResult {
	const handleOpenChange = useCallback(
		(value: boolean | undefined) => {
			if (value !== undefined) onOpenChange?.(value)
		},
		[onOpenChange],
	)

	const [pickerOpen, setPickerOpen] = useControllable({
		value: openProp,
		defaultValue: false,
		onValueChange: handleOpenChange,
	})

	const [state, dispatch] = useReducer(calendarPickerReducer, year, initialCalendarPickerState)

	const { view, pickerYear, decadeYear } = state

	const decadeStart = Math.floor(decadeYear / 10) * 10

	const pickerHeaderRef = useRef<HTMLDivElement>(null)
	const pickerGridRef = useRef<HTMLTableElement>(null)

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

			if (open) dispatch({ type: 'open', year })
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
				dispatch({ type: 'selectYear', year: y })

				focusPickerGrid()
			},
		}
	})

	const viewConfig: CalendarPickerViewConfig =
		view === 'months'
			? {
					prevLabel: 'Previous year',
					nextLabel: 'Next year',
					centerLabel: pickerYear,
					onPrev: () => dispatch({ type: 'stepYear', delta: -1 }),
					onNext: () => dispatch({ type: 'stepYear', delta: 1 }),
					onCenter: () => {
						dispatch({ type: 'showYears' })

						focusPickerGrid()
					},
					cells: monthCells,
					cellBlock: true,
					gridLabel: `Months in ${pickerYear}`,
					toolbarLabel: 'Year navigation',
				}
			: {
					prevLabel: 'Previous decade',
					nextLabel: 'Next decade',
					centerLabel: (
						<>
							{decadeStart}&ndash;{decadeStart + 9}
						</>
					),
					onPrev: () => dispatch({ type: 'stepDecade', delta: -10 }),
					onNext: () => dispatch({ type: 'stepDecade', delta: 10 }),
					onCenter: () => {
						dispatch({ type: 'showMonths' })

						focusPickerGrid()
					},
					cells: yearCells,
					cellBlock: false,
					gridLabel: `Years ${decadeStart}–${decadeStart + 9}`,
					toolbarLabel: 'Decade navigation',
				}

	return {
		pickerOpen,
		handlePickerOpen,
		pickerHeaderRef,
		pickerGridRef,
		handleHeaderKeyDown,
		handleGridKeyDown,
		viewConfig,
	}
}
