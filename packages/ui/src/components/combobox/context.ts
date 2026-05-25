'use client'

import { createContext } from '../../core'

type ComboboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	onSelect: (value: T) => void
	query: string
}

export const [ComboboxContext, useComboboxContext] = createContext<ComboboxContextValue>('Combobox')
