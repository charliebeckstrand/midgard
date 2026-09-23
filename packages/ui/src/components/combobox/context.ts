'use client'

import { createContext } from '../../core'

// `query`/`deferredQuery` live in the shared query context (`useComboboxQuery`),
// kept out of this one so options, which read only value/multiple/onSelect,
// don't re-render on every keystroke.
type ComboboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
	capitalize: boolean
}

/**
 * Selection state shared from the {@link Combobox} root to its options. It
 * carries the frozen `value`, the `multiple` flag, the `onSelect` callback, and
 * the `capitalize` flag for string option labels. The hook throws outside a
 * provider, with a message that names the host.
 *
 * @internal
 */
export const [ComboboxContext, useComboboxContext] = createContext<ComboboxContextValue>(
	'Combobox',
	{ error: 'ComboboxOption must be used within <Combobox>' },
)
