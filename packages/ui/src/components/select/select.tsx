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
 * variant, so one option at most is selected. Compose {@link SelectOption},
 * {@link SelectLabel}, and {@link SelectDescription} as children. The open and
 * disabled state attributes are the same as on {@link Listbox}. With no `value`
 * and no `defaultValue`, it starts empty and a click on the selected option
 * clears it (the `nullable` default of {@link Listbox}). Set `nullable={false}`
 * to keep one option selected after the first pick.
 *
 * @typeParam T - The option value type.
 */
export function Select<T>(props: SelectProps<T>) {
	return <Listbox<T> data-slot="select" {...props} />
}
