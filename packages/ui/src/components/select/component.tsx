'use client'

import { Listbox, type ListboxProps } from '../listbox'

export type SelectProps<T> = Omit<ListboxProps<T>, 'multiple'>

export function Select<T>(props: SelectProps<T>) {
	return <Listbox {...(props as ListboxProps<T>)} />
}
