'use client'

import { OptionsListbox } from './options-listbox'

/** Display labels for the standard size scale, keyed by token. Backs {@link SizeListbox}. */
export const sizeLabels: Record<string, string> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

type SizeListboxProps<T extends string> = {
	sizes: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: T) => void
}

/** A demo control for picking a component's `size` from a fixed scale, labelled via {@link sizeLabels}. */
export function SizeListbox<T extends string>({ sizes, ...rest }: SizeListboxProps<T>) {
	const options = sizes.map((value) => ({ value, label: sizeLabels[value] ?? value }))

	return <OptionsListbox options={options} {...rest} />
}
