'use client'

import { createContext } from '../../core'

type ListboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
	capitalize: boolean
}

/**
 * Selection state shared from the {@link Listbox} root to its options. The
 * hook throws outside a provider, with a message that names the host.
 *
 * @internal
 */
export const [ListboxContext, useListboxContext] = createContext<ListboxContextValue>('Listbox', {
	error: 'ListboxOption must be used within <Listbox> or <Select>',
})
