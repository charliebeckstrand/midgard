'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

const colorLabels: Record<string, string> = {
	zinc: 'Zinc',
	red: 'Red',
	amber: 'Amber',
	green: 'Green',
	blue: 'Blue',
}

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
			displayValue={(v: string) => colorLabels[v] ?? v}
			placement={placement}
			onValueChange={onValueChange as (value: T | undefined) => void}
		>
			{colors.map((c) => (
				<ListboxOption key={c} value={c}>
					<ListboxLabel>{colorLabels[c] ?? c}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
