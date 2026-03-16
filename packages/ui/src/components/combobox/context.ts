import { createContext } from '../../core'

export interface ComboboxContextValue {
	value: unknown
	onChange: (value: unknown) => void
	close: () => void
}

export const [ComboboxProvider, useCombobox] = createContext<ComboboxContextValue>('Combobox')
