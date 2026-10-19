'use client'

import { type KeyboardEvent, startTransition, useState } from 'react'
import { SearchInput } from '../../components/search-input'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useTimeout } from '../../hooks/use-timeout'
import { useIntl } from '../../primitives/intl/use-intl'
import { isComposing } from '../../utilities'
import { GRID_SEARCH_DEBOUNCE_MS } from './engine/grid-constants'
import { gridMessages } from './engine/grid-messages'
import type { GridGlobalFilterView } from './use-grid-table'

/** Props for {@link GridFilter}. @internal */
type GridFilterProps = {
	filter: GridGlobalFilterView
}

/**
 * Quick-search field for a filterable {@link Grid}: a {@link SearchInput} that
 * writes the global filter state through {@link GridGlobalFilterView}.
 *
 * @remarks
 * The typed text is held locally, so the field echoes every keystroke
 * immediately. On the default client path, the grid then filters its rows
 * again, which is O(rows × columns). It is debounced by
 * {@link GRID_SEARCH_DEBOUNCE_MS} and then pushed inside {@link startTransition}.
 * A fast typist therefore settles into a single filter pass that React keeps off
 * the critical path. Clearing bypasses the debounce and applies at once, recovering
 * the hidden rows without the settle lag.
 *
 * Enter flushes the pending query immediately. That is the same at-once path
 * as clearing, for a typist who wants the result before the debounce settles.
 * The field is not in a `<form>` of its own, because a grid can be in the form
 * of the consumer, and a `<form>` in a `<form>` is not valid HTML.
 *
 * @internal
 */
export function GridFilter({ filter }: GridFilterProps) {
	const intl = useIntl()

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

	const debounce = useTimeout()

	const push = (next: string) => {
		setPushed(next)

		startTransition(() => filter.setValue(next))
	}

	// An owner reset cancels the pending query, so the old text does not
	// overwrite the reset when the debounce settles. The query settles only when
	// no reset came after the keystroke that set it.
	const settle = useStableEvent((next: string, since: number) => {
		if (resets === since) push(next)
	})

	const apply = (next: string) => {
		setText(next)

		debounce.clear()

		// Clearing recovers the hidden rows, so flush it immediately rather than
		// lag a debounce behind the emptied field; a query settles after the wait.
		if (next === '') {
			push('')

			return
		}

		debounce.set(() => settle(next, resets), GRID_SEARCH_DEBOUNCE_MS)
	}

	// Enter cancels the pending debounce and applies the typed text now, so a
	// deliberate Enter lands the query without the settle wait. preventDefault
	// stops the implicit submission of a form around the grid.
	const commit = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || isComposing(event)) return

		event.preventDefault()

		debounce.clear()

		push(text)
	}

	const placeholder = filter.placeholder ?? intl.formatMessage(gridMessages.search)

	return (
		<div data-slot="grid-filter">
			<SearchInput
				value={text}
				onChange={(event) => apply(event.target.value)}
				onClear={() => apply('')}
				onKeyDown={commit}
				placeholder={placeholder}
				aria-label={placeholder}
			/>
		</div>
	)
}
