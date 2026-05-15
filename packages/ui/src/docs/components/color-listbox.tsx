'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

type ColorListboxProps<T extends string> = {
	colors: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: T) => void
}

export function ColorListbox<T extends string>({
	colors,
	value,
	placement = 'bottom-end',
	onValueChange,
}: ColorListboxProps<T>) {
	return (
		<Listbox
			value={value}
			displayValue={(v: string) => v}
			placement={placement}
			onValueChange={onValueChange as (value: T | undefined) => void}
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
