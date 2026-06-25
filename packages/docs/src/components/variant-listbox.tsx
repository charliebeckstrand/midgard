'use client'

import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { capitalize } from './format'

type VariantListboxProps<T extends string> = {
	variants: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: T) => void
}

/** A demo control for picking a component's `variant` from a fixed set, each option title-cased. */
export function VariantListbox<T extends string>({
	variants,
	value,
	placement = 'bottom-end',
	onValueChange,
}: VariantListboxProps<T>) {
	return (
		<Listbox
			value={value}
			displayValue={(v: string) => capitalize(v)}
			placement={placement}
			onValueChange={onValueChange as (value: T | undefined) => void}
			className="capitalize"
		>
			{variants.map((v) => (
				<ListboxOption key={v} value={v}>
					<ListboxLabel className="capitalize">{capitalize(v)}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
