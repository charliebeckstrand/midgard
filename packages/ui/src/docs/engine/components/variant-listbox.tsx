'use client'

import { OptionsListbox } from './options-listbox'

type VariantListboxProps<T extends string> = {
	variants: readonly T[]
	/** The picker's accessible name. Defaults to `Variant`. */
	label?: string
	value: T
	placement?: 'bottom-start' | 'bottom-end' | 'bottom-auto'
	onValueChange: (value: T) => void
}

/** A demo control for picking a component's `variant` from a fixed set, each option title-cased by the Listbox. */
export function VariantListbox<T extends string>({
	variants,
	label = 'Variant',
	...rest
}: VariantListboxProps<T>) {
	const options = variants.map((value) => ({ value, label: value }))

	return <OptionsListbox options={options} label={label} {...rest} />
}
