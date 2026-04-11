'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

interface VariantListboxProps<T extends string> {
	variants: readonly T[]
	value: T
	onChange: (value: T) => void
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function VariantListbox<T extends string>({
	variants,
	value,
	onChange,
}: VariantListboxProps<T>) {
	return (
		<Listbox
			value={value}
			onChange={onChange}
			className="min-w-28 capitalize"
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
