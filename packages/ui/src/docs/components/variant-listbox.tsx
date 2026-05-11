'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { capitalize } from './format'

interface VariantListboxProps<T extends string> {
	variants: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onChange: (value: T) => void
}

export function VariantListbox<T extends string>({
	variants,
	value,
	placement = 'bottom-end',
	onChange,
}: VariantListboxProps<T>) {
	return (
		<Listbox
			value={value}
			displayValue={(v: string) => capitalize(v)}
			placement={placement}
			onChange={onChange as (value: T | undefined) => void}
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
