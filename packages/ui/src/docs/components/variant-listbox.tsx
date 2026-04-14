'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

interface VariantListboxProps<T extends string> {
	variants: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onChange: (value: T) => void
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function VariantListbox<T extends string>({
	variants,
	value,
	placement = 'bottom-end',
	onChange,
}: VariantListboxProps<T>) {
	return (
		<Listbox
			value={value}
			placement={placement}
			onChange={onChange as (value: T | undefined) => void}
			className="sm:min-w-30 capitalize"
			displayValue={(v: string) => cap(v)}
		>
			{variants.map((v) => (
				<ListboxOption key={v} value={v}>
					<ListboxLabel className="capitalize">{cap(v)}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
