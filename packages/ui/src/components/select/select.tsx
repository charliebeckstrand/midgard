import { Listbox, type ListboxProps } from '../listbox'

/**
 * Props for {@link Select}: {@link ListboxProps} narrowed to its non-`multiple`
 * variant.
 *
 * @typeParam T - The option value type.
 */
export type SelectProps<T> = Extract<ListboxProps<T>, { multiple?: false }>

/**
 * Single-select dropdown: {@link Listbox} narrowed to its non-`multiple`
 * variant, so exactly one option is selected. Compose {@link SelectOption},
 * {@link SelectLabel}, and {@link SelectDescription} as children.
 *
 * @typeParam T - The option value type.
 */
export function Select<T>(props: SelectProps<T>) {
	return <Listbox<T> data-slot="select" {...props} />
}
