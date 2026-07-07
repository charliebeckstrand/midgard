'use client'

import { type ThemeMode, themeModes } from '../hooks/use-theme'
import { OptionsListbox } from './options-listbox'

type ThemeListboxProps = {
	value: ThemeMode
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: ThemeMode) => void
}

/** A demo control for switching the docs colour mode (light, dark, or system). */
export function ThemeListbox(props: ThemeListboxProps) {
	return <OptionsListbox options={themeModes} {...props} />
}
