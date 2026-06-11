'use client'

import { createContext } from '../../core'

type ListboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
}

export const [ListboxContext, useListboxContext] = createContext<ListboxContextValue>('Listbox')
