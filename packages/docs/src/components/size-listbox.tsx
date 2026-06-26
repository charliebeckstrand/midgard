'use client'

import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

/** Display labels for the standard size scale, keyed by token. Backs {@link SizeListbox}. */
export const sizeLabels: Record<string, string> = {
	xs: 'Extra small',
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra large',
}

type SizeListboxProps<T extends string> = {
	sizes: readonly T[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: T) => void
}

/** A demo control for picking a component's `size` from a fixed scale, labelled via {@link sizeLabels}. */
export function SizeListbox<T extends string>({
	sizes,
	value,
	placement = 'bottom-end',
	onValueChange,
}: SizeListboxProps<T>) {
	return (
		<Listbox
			value={value}
			displayValue={(v: string) => sizeLabels[v] ?? v}
			placement={placement}
			onValueChange={onValueChange as (value: T | undefined) => void}
		>
			{sizes.map((s) => (
				<ListboxOption key={s} value={s}>
					<ListboxLabel>{sizeLabels[s] ?? s}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
