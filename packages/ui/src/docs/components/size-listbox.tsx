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
	onChange: (value: T) => void
}

export function SizeListbox<T extends string>({ sizes, value, onChange }: SizeListboxProps<T>) {
	const wide = sizes.some((s) => s === 'xs' || s === 'xl')

	return (
		<Listbox
			value={value}
			onChange={onChange}
			className={`${wide ? 'min-w-36' : 'min-w-30'} capitalize`}
			displayValue={(v: string) => sizeLabels[v] ?? v}
		>
			{sizes.map((s) => (
				<ListboxOption key={s} value={s}>
					<ListboxLabel>{sizeLabels[s] ?? s}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
