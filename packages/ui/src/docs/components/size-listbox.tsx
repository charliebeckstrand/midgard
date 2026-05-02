'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

export const sizeLabels: Record<string, string> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

interface SizeListboxProps<T extends string> {
	sizes: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onChange: (value: T) => void
}

export function SizeListbox<T extends string>({
	sizes,
	value,
	placement = 'bottom-end',
	onChange,
}: SizeListboxProps<T>) {
	return (
		<Listbox
			value={value}
			displayValue={(v: string) => sizeLabels[v] ?? v}
			placement={placement}
			onChange={onChange as (value: T | undefined) => void}
			className="capitalize"
		>
			{sizes.map((s) => (
				<ListboxOption key={s} value={s}>
					<ListboxLabel>{sizeLabels[s] ?? s}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
