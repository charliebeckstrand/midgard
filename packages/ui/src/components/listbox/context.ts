'use client'

import { createContext } from '../../core'

type ListboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
	close: () => void
}

export const [ListboxProvider, useListboxContext] = createContext<ListboxContextValue>('Listbox')
