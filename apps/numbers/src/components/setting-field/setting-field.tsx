'use client'

import { Field, Label } from 'ui/fieldset'
import { Switch } from 'ui/switch'
import { useGameSetting } from '../../hooks/use-game-setting'
import type { GameSettings } from '../../utilities/settings'

/** Props for {@link SettingField}. */
export type SettingFieldProps = {
	/** The setting that the switch turns on and off. */
	name: keyof GameSettings
	label: string
}

/** A setting of the game: a Label above a Switch, in the form of the appearance fields. */
export function SettingField({ name, label }: SettingFieldProps) {
	const [on, setOn] = useGameSetting(name)

	return (
		<Field>
			<Label>{label}</Label>
			<Switch checked={on} onChange={(event) => setOn(event.target.checked)} />
		</Field>
	)
}
