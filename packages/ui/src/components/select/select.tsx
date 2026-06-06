import { Listbox, type ListboxProps } from '../listbox'

export type SelectProps<T> = Extract<ListboxProps<T>, { multiple?: false }>

export function Select<T>(props: SelectProps<T>) {
	return <Listbox<T> data-slot="select" {...props} />
}
