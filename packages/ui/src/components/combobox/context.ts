'use client'

import { createContext } from '../../core'

// `query`/`deferredQuery` live in the shared query context (`useComboboxQuery`),
// kept out of this one so options, which read only value/multiple/onSelect,
// don't re-render on every keystroke.
type ComboboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
}

/**
 * Selection state shared from the {@link Combobox} root to its options:
 * the frozen `value`, the `multiple` flag, and the `onSelect` callback.
 *
 * @internal
 */
export const [ComboboxContext] = createContext<ComboboxContextValue>('Combobox')
