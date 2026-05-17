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
import { MONTHS } from './calendar-utilities'
import { useCalendarFocus } from './use-calendar-focus'

type View = 'months' | 'years'

type State = {
	view: View
	pickerYear: number
	decadeYear: number
}

type Action =
	| { type: 'open'; year: number }
	| { type: 'stepYear'; delta: number }
	| { type: 'stepDecade'; delta: number }
	| { type: 'showYears' }
	| { type: 'showMonths' }
	| { type: 'selectYear'; year: number }

function reduce(state: State, action: Action): State {
	switch (action.type) {
		case 'open':
			return { view: 'months', pickerYear: action.year, decadeYear: action.year }
		case 'stepYear':
			return { ...state, pickerYear: state.pickerYear + action.delta }
		case 'stepDecade':
			return { ...state, decadeYear: state.decadeYear + action.delta }
		case 'showYears':
			return { ...state, view: 'years', decadeYear: state.pickerYear }
		case 'showMonths':
			return { ...state, view: 'months' }
		case 'selectYear':
			return { ...state, view: 'months', pickerYear: action.year }
	}
}

export type UseCalendarPickerInput = {
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
}

export type UseCalendarPickerResult = {
	pickerOpen: boolean | undefined
	handlePickerOpen: (open: boolean) => void
	pickerHeaderRef: RefObject<HTMLDivElement | null>
	pickerGridRef: RefObject<HTMLDivElement | null>
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
}: UseCalendarPickerInput): UseCalendarPickerResult {
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

	const [state, dispatch] = useReducer(reduce, undefined, () => ({
		view: 'months' as View,
		pickerYear: year,
		decadeYear: year,
	}))

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
