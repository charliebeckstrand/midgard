'use client'

import { startTransition, useState } from 'react'
import { SearchInput } from '../../components/search-input'
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
 * O(rows × columns) on the default client path — is pushed inside
 * {@link startTransition} so React keeps it off the critical path and interrupts
 * an in-flight filter when the next key lands.
 *
 * @internal
 */
export function GridFilter({ filter }: GridFilterProps) {
	const [text, setText] = useState(filter.value)

	const apply = (next: string) => {
		setText(next)

		startTransition(() => filter.setValue(next))
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
