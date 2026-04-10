'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../components/listbox'

interface ColorListboxProps<T extends string> {
	colors: readonly T[]
	value: T
	onChange: (value: T) => void
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function ColorListbox<T extends string>({ colors, value, onChange }: ColorListboxProps<T>) {
	return (
		<Listbox
			value={value}
			onChange={onChange}
			className="min-w-28 capitalize"
			displayValue={(v: string) => cap(v)}
		>
			{colors.map((c) => (
				<ListboxOption key={c} value={c}>
					<ListboxLabel className="capitalize">{cap(c)}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
