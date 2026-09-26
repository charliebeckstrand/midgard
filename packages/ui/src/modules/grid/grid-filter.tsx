'use client'

import { type SubmitEvent, startTransition, useEffect, useRef, useState } from 'react'
import { SearchInput } from '../../components/search-input'
import { GRID_SEARCH_DEBOUNCE_MS } from './engine/grid-constants'
import type { GridGlobalFilterView } from './use-grid-table'

/** Props for {@link GridFilter}. @internal */
type GridFilterProps = {
	filter: GridGlobalFilterView
}

/**
 * Quick-search field for a filterable {@link Grid}: a {@link SearchInput} that
 * drives the engine's global filter through {@link GridGlobalFilterView}.
 *
 * @remarks
 * The typed text is held locally, so the field echoes every keystroke
 * immediately. The engine's global filter is a client re-filter that is
 * O(rows × columns) on the default client path. It is debounced by
 * {@link GRID_SEARCH_DEBOUNCE_MS} and then pushed inside {@link startTransition}.
 * A fast typist therefore settles into a single filter pass that React keeps off
 * the critical path. Clearing bypasses the debounce and applies at once, recovering
 * the hidden rows without the settle lag.
 *
 * The field is a lone control in a `<form>`, so pressing Enter submits it and
 * flushes the pending query immediately. That is the same at-once path as
 * clearing, for a typist who wants the result before the debounce settles.
 *
 * @internal
 */
export function GridFilter({ filter }: GridFilterProps) {
	const [text, setText] = useState(filter.value)

	// The last query this field sent, and the last value it received. A value
	// that differs from the sent query comes from the owner, for example a
	// reset, so the field shows it.
	const [pushed, setPushed] = useState(filter.value)

	const [received, setReceived] = useState(filter.value)

	const [resets, setResets] = useState(0)

	if (received !== filter.value) {
		setReceived(filter.value)

		if (filter.value !== pushed) {
			setText(filter.value)

			setPushed(filter.value)

			setResets((count) => count + 1)
		}
	}

	const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(debounceTimer.current), [])

	// An owner reset cancels the pending query, so the old text does not
	// overwrite the reset when the debounce settles.
	useEffect(() => {
		if (resets > 0) clearTimeout(debounceTimer.current)
	}, [resets])

	const push = (next: string) => {
		setPushed(next)

		startTransition(() => filter.setValue(next))
	}

	const apply = (next: string) => {
		setText(next)

		clearTimeout(debounceTimer.current)

		// Clearing recovers the hidden rows, so flush it immediately rather than
		// lag a debounce behind the emptied field; a query settles after the wait.
		if (next === '') {
			push('')

			return
		}

		debounceTimer.current = setTimeout(() => push(next), GRID_SEARCH_DEBOUNCE_MS)
	}

	// Enter submits the field: cancel the pending debounce and apply the typed
	// text now, so a deliberate submit lands the query without the settle wait.
	const submit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault()

		clearTimeout(debounceTimer.current)

		push(text)
	}

	return (
		<form data-slot="grid-filter" onSubmit={submit}>
			<SearchInput
				value={text}
				onChange={(event) => apply(event.target.value)}
				onClear={() => apply('')}
				placeholder={filter.placeholder}
				aria-label={filter.placeholder}
			/>
		</form>
	)
}
