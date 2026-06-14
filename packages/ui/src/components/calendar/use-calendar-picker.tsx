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
import type { CalendarPickerGridCell } from './calendar-picker-grid'
import { calendarPickerReducer, initialCalendarPickerState } from './calendar-picker-reducer'
import { useCalendarFocus } from './use-calendar-focus'

/** Options for {@link useCalendarPicker}: the calendar's current `year`/`month`, `today` for the current-marker, locale `monthLabels`, the `onNavigate` commit callback, and the controllable open state. @internal */
type CalendarPickerOptions = {
	year: number
	month: number
	today: Date | null
	monthLabels: string[]
	onNavigate: (year: number, month: number) => void
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

/** Per-view render config for {@link CalendarPickerGrid}: toolbar labels/handlers, center label, the cell list, and whether cells render full-width. @internal */
type CalendarPickerViewConfig = {
	gridLabel: string
	prevLabel: string
	nextLabel: string
	centerLabel: ReactNode
	onPrev: () => void
	onNext: () => void
	onCenter: () => void
	cells: CalendarPickerGridCell[]
	cellBlock: boolean
}

/** Return shape of {@link useCalendarPicker}: open state and setter, the header/grid refs, their roving-focus keydown handlers, and the active view's render config. @internal */
type CalendarPickerResult = {
	pickerOpen: boolean | undefined
	handlePickerOpen: (open: boolean) => void
	pickerHeaderRef: RefObject<HTMLDivElement | null>
	pickerGridRef: RefObject<HTMLDivElement | null>
	handleHeaderKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	handleGridKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	viewConfig: CalendarPickerViewConfig
}

/**
 * Drives the month/year picker behind {@link CalendarPicker}: owns the
 * controllable open state, the month/decade view reducer, and the sealed
 * roving-focus wiring, deriving the per-view cell list and toolbar config.
 *
 * @returns A {@link CalendarPickerResult}: `pickerOpen` and `handlePickerOpen`,
 * the `pickerHeaderRef`/`pickerGridRef` zone refs, their `handleHeaderKeyDown`/
 * `handleGridKeyDown` handlers, and the active-view `viewConfig`.
 * @remarks Opening reseeds the view to the current year and focuses the grid
 * (selected cell first) after a frame; the focus model is sealed
 * (`stopPropagation`) so arrows don't leak to the calendar underneath.
 */
export function useCalendarPicker({
	year,
	month,
	today,
	monthLabels,
	onNavigate,
	open: openProp,
	onOpenChange,
}: CalendarPickerOptions): CalendarPickerResult {
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

	const prevPickerOpenRef = useRef(false)

	// A ref mirrors `year`, keeping it out of the open effect's deps; year
	// changes while the picker is open do not refocus the grid.
	const yearRef = useRef(year)

	yearRef.current = year

	useEffect(() => {
		const wasOpen = prevPickerOpenRef.current

		prevPickerOpenRef.current = pickerOpen ?? false

		if (!pickerOpen) return

		// Resets the view/year on every open transition, including imperative
		// (`openPicker()`) and controlled opens that bypass handlePickerOpen; the
		// picker reopens with a fresh view and navigates from the current year.
		if (!wasOpen) dispatch({ type: 'open', year: yearRef.current })

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

	const monthCells: CalendarPickerGridCell[] = monthLabels.map((label, i) => ({
		key: label,
		label,
		selected: i === month && pickerYear === year,
		current: today != null && i === today.getMonth() && pickerYear === today.getFullYear(),
		onSelect: () => selectMonth(i),
	}))

	const yearCells: CalendarPickerGridCell[] = Array.from({ length: 12 }, (_, i) => {
		const y = decadeStart - 1 + i

		return {
			key: y,
			label: y,
			selected: y === year,
			current: today != null && y === today.getFullYear(),
			onSelect: () => {
				dispatch({ type: 'selectYear', year: y })

				focusPickerGrid()
			},
		}
	})

	const viewConfig: CalendarPickerViewConfig =
		view === 'months'
			? {
					gridLabel: 'Select month',
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
				}
			: {
					gridLabel: 'Select year',
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
