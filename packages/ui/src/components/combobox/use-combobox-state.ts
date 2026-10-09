'use client'

import {
	type RefObject,
	useCallback,
	useDeferredValue,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { useControllableFlag } from '../../hooks/use-controllable'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'
import { useFrozenOnClose } from '../../hooks/use-frozen-on-close'
import { useStableEvent } from '../../hooks/use-stable-event'

type ComboboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	value: T | T[] | undefined
	closeOnSelect?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onQueryChange?: (query: string) => void
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
	inputRef: RefObject<HTMLInputElement | null>
}

/**
 * Query, open, editing, and selection state for the combobox root.
 *
 * @returns `{ query, deferredQuery, setQuery, open, setOpen, editing,
 *   setEditing, close, select, keep, flushPending, selectionValue }`. `query`
 *   tracks every keystroke; `deferredQuery` lags for filtering but snaps to empty
 *   immediately so clearing the filter is instant. `open` is controllable via
 *   the `open` prop. `select` commits or toggles the value, then closes or resets
 *   the query and refocuses the input depending on `closeOnSelect` (defaults to
 *   single-selection). `keep` ends a pick in the same way, with no change to the
 *   value, for an Enter on the selected option. `selectionValue`/`flushPending`
 *   come from the deferred toggle so the menu reads a value frozen until the
 *   panel finishes closing.
 *   `menuQuery`/`menuDeferredQuery` are the query the *menu content* reads,
 *   frozen at their close-time snapshot until `flushPending` runs. The filter
 *   therefore holds steady through the exit animation, instead of snapping back
 *   to the full list. That holds a deeply scrolled virtual window too. While
 *   `open` is `true`, the menu reads the live query and the live selection.
 * @remarks `closeOnSelect` defaults to `true` for single, `false` for multiple.
 *   `setOpen` and `setQuery` report to `onOpenChange` and `onQueryChange` only
 *   a value that is new to the consumer.
 * @internal
 */
export function useComboboxState<T>({
	multiple,
	nullable,
	value,
	closeOnSelect,
	open: openProp,
	onOpenChange,
	onQueryChange,
	setValue,
	inputRef,
}: ComboboxStateParams<T>) {
	const [query, setQueryInternal] = useState('')

	// An empty query bypasses deferral; the filter clears immediately.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	// The setters repeat a value: each keystroke opens the panel, and an outside
	// press and then the input blur both close it. The controllable reports only
	// a change, so the repeats report nothing.
	const [open, setOpen] = useControllableFlag({
		value: openProp,
		onValueChange: onOpenChange,
	})

	const [editing, setEditing] = useState(false)

	// Read `onQueryChange` as a stable event so `setQuery` keeps one identity
	// across keystrokes. Carried as a dependency, an inline `onQueryChange`
	// would give `setQuery` — and through it `close`, `select`, and the combobox
	// context — a new identity each render, re-rendering every option on the
	// typing path the refs below (and the deferred query) exist to keep cheap.
	// `useControllable` keeps its own `onValueChange` in a ref instead, because
	// its setter can run during render.
	//
	// The query is internal state, and only `setQuery` writes it. Thus the last
	// report is the query that the consumer knows. A call with that query does
	// not report: close() and a multi pick clear a query that is already empty.
	const reportedQueryRef = useRef(query)

	const reportQuery = useStableEvent((next: string) => {
		if (next === reportedQueryRef.current) return

		reportedQueryRef.current = next

		onQueryChange?.(next)
	})

	const setQuery = useCallback(
		(next: string) => {
			setQueryInternal(next)

			reportQuery(next)
		},
		[reportQuery],
	)

	// Snapshot of the query the menu content filters on, frozen while the panel
	// animates closed. Clearing `query` synchronously on close snaps
	// `deferredQuery` to `''` (the empty-query bypass above), re-expanding a
	// filtered list back to its full extent under the still-visible exit
	// animation; a virtual window scrolled to a far-down match then repaints the
	// top of the full list, flickering. Released on exit-complete or reopen.
	const {
		snapshot: frozenQuery,
		freeze: freezeQuery,
		flush: flushFrozenQuery,
	} = useFrozenOnClose<{ query: string; deferredQuery: string }>(open)

	// A stable event, so that `close` — and through it `select` and the combobox
	// context — keeps one identity on each keystroke. A new identity would
	// re-render each option on the typing path that the deferred query keeps
	// cheap.
	const close = useStableEvent(() => {
		// An outside press closes the panel, and then the input blur calls close()
		// again. The query is empty by then, so a second snapshot would expand the
		// list under the exit animation. Only the close of an open panel starts an
		// exit animation, so only that close takes a snapshot.
		if (open) freezeQuery({ query, deferredQuery })

		setOpen(false)

		setQuery('')

		setEditing(false)
	})

	const shouldClose = closeOnSelect ?? !multiple

	const {
		toggle,
		commit,
		flushPending: flushToggle,
		selectionValue,
	} = useDeferredToggle<T>({
		multiple,
		nullable,
		value,
		setValue,
		open,
	})

	// Release the frozen selection *and* the frozen query together on
	// exit-complete; both were snapshotted for the same close animation.
	const flushPending = useCallback(() => {
		flushToggle()

		flushFrozenQuery()
	}, [flushToggle, flushFrozenQuery])

	// The count of the picks that keep the panel open. Each such pick adds one,
	// and the count at the last text selection lets the effect below act once.
	const [pickCount, setPickCount] = useState(0)

	const selectedPickRef = useRef(pickCount)

	// A pick that keeps the panel open ends editing. Its commit then writes the
	// resting display into the input, which for a multiple selection is the
	// summary of what is picked. A write of a different value moves the caret to
	// the end and clears the text selection. Thus this layout effect selects the
	// text after that write, before paint. The next key then replaces the
	// summary. A selection in the handler comes before the write and clears, so
	// the next key appends to the summary and searches for "Texas (US)u".
	useLayoutEffect(() => {
		if (pickCount === selectedPickRef.current) return

		selectedPickRef.current = pickCount

		inputRef.current?.select()
	}, [pickCount, inputRef])

	// The end of a pick, with no change to the value. A pick that closes calls
	// close(). Otherwise the panel stays open and the query and editing reset.
	// Enter on the selected option calls this alone: it chooses the value that the
	// combobox holds, and a toggle would clear a `nullable` value.
	const keep = useCallback(() => {
		if (shouldClose) {
			close()

			return
		}

		setQuery('')

		setEditing(false)

		// The panel stays open, so the input keeps the focus for the next key. The
		// layout effect above selects the text of the input after this commit.
		inputRef.current?.focus()

		setPickCount((count) => count + 1)
	}, [shouldClose, close, setQuery, inputRef])

	const select = useCallback(
		(newValue: T) => {
			// A pick that closes freezes the selection that the menu shows, for the
			// exit animation. A pick that keeps the panel open updates it live.
			if (shouldClose) commit(newValue)
			else toggle(newValue)

			keep()
		},
		[shouldClose, toggle, commit, keep],
	)

	return {
		query,
		deferredQuery,
		// The query the menu content reads: frozen at its close-time snapshot
		// until flushPending, so the filtered set (and any deeply scrolled virtual
		// window) holds steady through the exit animation instead of re-expanding.
		menuQuery: frozenQuery ? frozenQuery.value.query : query,
		menuDeferredQuery: frozenQuery ? frozenQuery.value.deferredQuery : deferredQuery,
		setQuery,
		open,
		setOpen,
		editing,
		setEditing,
		close,
		select,
		keep,
		flushPending,
		selectionValue,
	}
}

/**
 * Builds the open-state callback that the combobox root gives to
 * `useFloatingUI`. The floating-ui hooks report each dismissal there: an
 * outside press or an Escape.
 *
 * @param setOpen - The guarded setter of the root. An open goes through it, so
 *   a read-only or a disabled combobox stays closed.
 * @param close - The `close` of {@link useComboboxState}. A close goes through
 *   it, so the query and the editing flag reset, as on a blur.
 * @returns The `onOpenChange` callback for `useFloatingUI`.
 * @internal
 */
export function routeFloatingOpenChange(
	setOpen: (open: boolean) => void,
	close: () => void,
): (open: boolean) => void {
	return (open) => {
		if (open) setOpen(true)
		else close()
	}
}
