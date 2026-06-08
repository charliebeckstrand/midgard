'use client'

import { createContext } from '../../core'

// `query`/`deferredQuery` are not in context; they are passed as render-prop
// arguments instead. Options read only value/multiple/onSelect.
type ComboboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
}

export const [ComboboxContext, useComboboxContext] = createContext<ComboboxContextValue>('Combobox')
