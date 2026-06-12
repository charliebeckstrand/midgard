'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { type SurfaceMode, surfaceModes } from '../hooks/use-surface'

type SurfaceListboxProps = {
	value: SurfaceMode
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: SurfaceMode) => void
}

export function SurfaceListbox({
	value,
	placement = 'bottom-end',
	onValueChange,
}: SurfaceListboxProps) {
	return (
		<Listbox<SurfaceMode>
			value={value}
			displayValue={(v) => surfaceModes.find((m) => m.value === v)?.label ?? v}
			placement={placement}
			onValueChange={(v) => v && onValueChange(v)}
		>
			{surfaceModes.map((mode) => (
				<ListboxOption key={mode.value} value={mode.value}>
					<ListboxLabel>{mode.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
