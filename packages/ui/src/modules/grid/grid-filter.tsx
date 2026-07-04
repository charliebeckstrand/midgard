'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import { SearchInput } from '../../components/search-input'
import { GRID_SEARCH_DEBOUNCE_MS } from './grid-constants'
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
 * The typed text is held locally so the field echoes every keystroke
 * immediately, while the engine's global filter — a client re-filter that is
 * O(rows × columns) on the default client path — is debounced by
 * {@link GRID_SEARCH_DEBOUNCE_MS} and then pushed inside {@link startTransition},
 * so a fast typist settles into a single filter pass that React keeps off the
 * critical path. Clearing bypasses the debounce and applies at once, recovering
 * the hidden rows without the settle lag.
 *
 * @internal
 */
export function GridFilter({ filter }: GridFilterProps) {
	const [text, setText] = useState(filter.value)

	const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(debounceTimer.current), [])

	const apply = (next: string) => {
		setText(next)

		clearTimeout(debounceTimer.current)

		// Clearing recovers the hidden rows, so flush it immediately rather than
		// lag a debounce behind the emptied field; a query settles after the wait.
		if (next === '') {
			startTransition(() => filter.setValue(''))

			return
		}

		debounceTimer.current = setTimeout(() => {
			startTransition(() => filter.setValue(next))
		}, GRID_SEARCH_DEBOUNCE_MS)
	}

	return (
		<div data-slot="grid-filter">
			<SearchInput
				value={text}
				onChange={(event) => apply(event.target.value)}
				onClear={() => apply('')}
				placeholder={filter.placeholder}
				aria-label={filter.placeholder}
			/>
		</div>
	)
}
