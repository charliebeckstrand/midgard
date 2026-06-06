import { Listbox, type ListboxProps } from '../listbox'

export type SelectProps<T> = Extract<ListboxProps<T>, { multiple?: false }>

/** Single-select listbox — Listbox narrowed to its non-`multiple` variant. */
export function Select<T>(props: SelectProps<T>) {
	return <Listbox<T> data-slot="select" {...props} />
}
