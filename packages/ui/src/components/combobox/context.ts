'use client'

import { createContext } from '../../core'

// `query`/`deferredQuery` are intentionally NOT here: the only consumer (the
// option row) reads just value/multiple/onSelect, and the render-prop receives
// the query as arguments. Keeping them out of the context means typing doesn't
// change the provider identity and re-render every option, preserving the
// useDeferredValue split.
type ComboboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
}

export const [ComboboxContext, useComboboxContext] = createContext<ComboboxContextValue>('Combobox')
