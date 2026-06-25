'use client'

import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { type DensityLevel, densityLevels } from 'ui/providers/density'

type DensityListboxProps = {
	value: DensityLevel
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: DensityLevel) => void
}

export function DensityListbox({
	value,
	placement = 'bottom-end',
	onValueChange,
}: DensityListboxProps) {
	return (
		<Listbox<DensityLevel>
			value={value}
			displayValue={(v) => densityLevels.find((d) => d.value === v)?.label ?? v}
			placement={placement}
			onValueChange={(v) => v && onValueChange(v)}
		>
			{densityLevels.map((level) => (
				<ListboxOption key={level.value} value={level.value}>
					<ListboxLabel>{level.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
