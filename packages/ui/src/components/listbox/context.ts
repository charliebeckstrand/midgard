import { createContext } from '../../core'

export interface ListboxContextValue {
	open: boolean
	value: unknown
	onChange: (value: unknown) => void
	close: () => void
	disabled?: boolean
	invalid?: boolean
}

export const [ListboxProvider, useListbox] = createContext<ListboxContextValue>('Listbox')

export interface SelectedOptionContextValue {
	isSelectedOption: boolean
}

export const [SelectedOptionProvider, useSelectedOption] =
	createContext<SelectedOptionContextValue>('SelectedOption')
