'use client'

import type { ReactNode } from 'react'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

type ChoiceListboxProps<T extends string> = {
	options: readonly { label: string; value: T }[]
	value: T
	onValueChange: (value: T) => void
	suffix?: ReactNode
}

/**
 * A {@link Listbox} over a fixed labeled option set. The guard drops an empty
 * selection, so `onValueChange` always gets a value.
 *
 * @internal
 */
export function ChoiceListbox<T extends string>({
	options,
	value,
	onValueChange,
	suffix,
}: ChoiceListboxProps<T>) {
	const labelFor = (choice: T) => options.find((option) => option.value === choice)?.label ?? choice

	return (
		<Listbox<T>
			value={value}
			displayValue={labelFor}
			placement="bottom-start"
			suffix={suffix}
			onValueChange={(next) => next && onValueChange(next)}
		>
			{options.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
