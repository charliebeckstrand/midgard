'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

interface ColorListboxProps<T extends string> {
	colors: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onChange: (value: T) => void
}

// const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function ColorListbox<T extends string>({
	colors,
	value,
	placement = 'bottom-end',
	onChange,
}: ColorListboxProps<T>) {
	return (
		<Listbox
			value={value}
			displayValue={(v: string) => v}
			placement={placement}
			onChange={onChange as (value: T | undefined) => void}
			className="capitalize"
		>
			{colors.map((c) => (
				<ListboxOption key={c} value={c}>
					<ListboxLabel className="capitalize">{c}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
