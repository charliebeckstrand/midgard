'use client'

import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { type ThemeMode, themeModes } from '../hooks/use-theme'

type ThemeListboxProps = {
	value: ThemeMode
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: ThemeMode) => void
}

/** A demo control for switching the docs colour mode (light, dark, or system). */
export function ThemeListbox({
	value,
	placement = 'bottom-end',
	onValueChange,
}: ThemeListboxProps) {
	return (
		<Listbox<ThemeMode>
			value={value}
			displayValue={(v) => themeModes.find((m) => m.value === v)?.label ?? v}
			placement={placement}
			onValueChange={(v) => v && onValueChange(v)}
		>
			{themeModes.map((mode) => (
				<ListboxOption key={mode.value} value={mode.value}>
					<ListboxLabel>{mode.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
