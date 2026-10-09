'use client'

import {
	type KeyboardEvent,
	type ReactNode,
	type Ref,
	type RefObject,
	useCallback,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { resolveFormat } from '../../utilities'
import type { CalendarPickerGridCell } from './calendar-picker-grid'
import { calendarPickerReducer, initialCalendarPickerState } from './calendar-picker-reducer'
import { isYearInRange, MAX_YEAR, MIN_YEAR } from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'

/** The selected cell of the picker grid: its Tab stop, and the cell that an open focuses. @internal */
const SELECTED_CELL = '[data-selected]'

/** Options for {@link useCalendarPicker}: the calendar's current `year`/`month`, `today` for the current-marker, locale `monthLabels`, the `onNavigate` commit callback, and the open state. @internal */
type CalendarPickerOptions = {
	year: number
	month: number
	today: Date | null
	monthLabels: string[]
	/** The resolved BCP 47 tag of the calendar. The years use the digits of this locale, as `monthLabels` do. */
	localeTag: string
	onNavigate: (year: number, month: number) => void
	/** The calendar owns the open state, so its `openPicker` handle can open the picker. */
	open: boolean
	onOpenChange: (open: boolean) => void
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

/** Return shape of {@link useCalendarPicker}. It holds the header/grid refs, their roving-focus keydown handlers, and the active view's render config. @internal */
type CalendarPickerResult = {
	pickerHeaderRef: RefObject<HTMLDivElement | null>
	pickerGridRef: Ref<HTMLDivElement>
	handleHeaderKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	handleGridKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	viewConfig: CalendarPickerViewConfig
}

/**
 * Drives the month/year picker behind {@link CalendarPicker}: owns the
 * month/decade view reducer and the sealed roving-focus wiring. It derives the
 * cell list and toolbar config of the view on screen.
 *
 * @returns A {@link CalendarPickerResult}: the `pickerHeaderRef`/`pickerGridRef`
 * zone refs, their `handleHeaderKeyDown`/`handleGridKeyDown` handlers, and the
 * active-view `viewConfig`.
 * @remarks Each open reseeds the view to the current year during render, so the
 * first open frame shows the fresh view. It then focuses the grid (selected cell
 * first) after a frame. The grid is one Tab stop, on the selected cell. The focus
 * model is sealed (`stopPropagation`), so arrows don't leak to the calendar
 * underneath.
 */
export function useCalendarPicker({
	year,
	month,
	today,
	monthLabels,
	localeTag,
	onNavigate,
	open,
	onOpenChange,
}: CalendarPickerOptions): CalendarPickerResult {
	const [state, dispatch] = useReducer(calendarPickerReducer, year, initialCalendarPickerState)

	// Each open transition reseeds the view on the calendar's year, during render.
	// The trigger and the `openPicker` handle both pass here, so the first frame
	// of each open shows a fresh view.
	const [wasOpen, setWasOpen] = useState(open)

	// The popover mounts the grid in its portal one commit after `open` turns on.
	// The grid ref callback sets `gridMounted` on each open, and each close clears
	// it, so the roving hook puts the Tab stop on the grid after the grid mounts.
	const [gridMounted, setGridMounted] = useState(false)

	if (open !== wasOpen) {
		setWasOpen(open)

		if (open) dispatch({ type: 'open', year })
		else setGridMounted(false)
	}

	const { view, pickerYear, decadeYear } = state

	// A year has no grouping separator: 2025, not "2,025". It uses the digits of
	// the locale, as the month labels and the day numbers do.
	const formatYear = useMemo(
		() =>
			resolveFormat(
				{ type: 'integer' },
				{ locale: localeTag, numberFormat: { useGrouping: false } },
			),
		[localeTag],
	)

	const pickerHeaderRef = useRef<HTMLDivElement>(null)
	const gridRef = useRef<HTMLDivElement>(null)

	const { handleHeaderKeyDown, handleGridKeyDown } = useCalendarFocus({
		headerRef: pickerHeaderRef,
		gridRef,
		cols: 3,
		activeSelector: SELECTED_CELL,
		gridMounted,
		stopPropagation: true,
	})

	// Returns the frame, so the grid ref callback can cancel it on detach.
	const focusPickerGrid = useCallback(
		() =>
			requestAnimationFrame(() => {
				const grid = gridRef.current

				if (!grid) return

				const selected = grid.querySelector<HTMLElement>(SELECTED_CELL)

				;(selected ?? grid.querySelector<HTMLElement>('button:not(:disabled)'))?.focus()
			}),
		[],
	)

	// The callback lists `open`, so React attaches the grid again on each open
	// and each close. A reopen during the exit animation keeps the same grid
	// node, and the open attach still focuses it and restores its Tab stop.
	const attachGrid = useCallback(() => {
		if (!open) return

		setGridMounted(true)

		const frame = focusPickerGrid()

		return () => cancelAnimationFrame(frame)
	}, [open, focusPickerGrid])

	const pickerGridRef = useComposedRef(gridRef, attachGrid)

	let viewConfig: CalendarPickerViewConfig

	if (view === 'months') {
		viewConfig = {
			gridLabel: 'Select month',
			prevLabel: 'Previous year',
			nextLabel: 'Next year',
			centerLabel: formatYear(pickerYear),
			onPrev: () => dispatch({ type: 'stepYear', delta: -1 }),
			onNext: () => dispatch({ type: 'stepYear', delta: 1 }),
			onCenter: () => {
				dispatch({ type: 'showYears' })

				focusPickerGrid()
			},
			cells: monthLabels.map((label, i) => ({
				key: label,
				label,
				selected: i === month && pickerYear === year,
				current: today != null && i === today.getMonth() && pickerYear === today.getFullYear(),
				onSelect: () => {
					onNavigate(pickerYear, i)

					onOpenChange(false)
				},
			})),
			cellBlock: true,
		}
	} else {
		const decadeStart = Math.floor(decadeYear / 10) * 10

		viewConfig = {
			gridLabel: 'Select year',
			prevLabel: 'Previous decade',
			nextLabel: 'Next decade',
			// The label names only the years that the calendar can show.
			centerLabel: [Math.max(decadeStart, MIN_YEAR), Math.min(decadeStart + 9, MAX_YEAR)]
				.map(formatYear)
				.join('–'),
			onPrev: () => dispatch({ type: 'stepDecade', delta: -10 }),
			onNext: () => dispatch({ type: 'stepDecade', delta: 10 }),
			onCenter: () => {
				dispatch({ type: 'showMonths' })

				focusPickerGrid()
			},
			// The decade and one year on each side. A year outside 1 to 9999 stays in
			// the grid as a disabled cell. The grid then keeps its three columns and
			// four rows, and the arrow keys skip the cell.
			cells: Array.from({ length: 12 }, (_, i) => {
				const y = decadeStart - 1 + i

				return {
					key: y,
					label: formatYear(y),
					selected: y === pickerYear,
					current: today != null && y === today.getFullYear(),
					disabled: !isYearInRange(y),
					onSelect: () => {
						dispatch({ type: 'selectYear', year: y })

						focusPickerGrid()
					},
				}
			}),
			cellBlock: false,
		}
	}

	return {
		pickerHeaderRef,
		pickerGridRef,
		handleHeaderKeyDown,
		handleGridKeyDown,
		viewConfig,
	}
}
