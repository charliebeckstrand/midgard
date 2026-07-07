'use client'

import { capitalize } from './format'
import { OptionsListbox } from './options-listbox'

type VariantListboxProps<T extends string> = {
	variants: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: T) => void
}

/** A demo control for picking a component's `variant` from a fixed set, each option title-cased. */
export function VariantListbox<T extends string>({ variants, ...rest }: VariantListboxProps<T>) {
	const options = variants.map((value) => ({ value, label: capitalize(value) }))

	return (
		<OptionsListbox
			options={options}
			className="capitalize"
			optionClassName="capitalize"
			{...rest}
		/>
	)
}
