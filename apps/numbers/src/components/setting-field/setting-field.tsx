'use client'

import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Switch } from 'ui/switch'
import { useGameSetting } from '../../hooks/use-game-setting'
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../../utilities/game'
import type { GameSettings } from '../../utilities/settings'

/** The name of each setting that is on or off. */
type SwitchSetting = {
	[Name in keyof GameSettings]: GameSettings[Name] extends boolean ? Name : never
}[keyof GameSettings]

/** Props for {@link SettingField}. */
export type SettingFieldProps = {
	/** The setting that the switch turns on and off. */
	name: SwitchSetting
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

/**
 * The level of the CPU in Vs CPU: a Label above a Listbox, as the pickers of
 * the appearance fields. A change applies at once, also during a run: the
 * column of the CPU plays the same numbers again at the new level.
 */
export function DifficultyField() {
	const [difficulty, setDifficulty] = useGameSetting('difficulty')

	return (
		<Field>
			<Label>CPU difficulty</Label>
			<Listbox<Difficulty>
				value={difficulty}
				displayValue={(value) => DIFFICULTY_LABELS[value]}
				placement="bottom-start"
				onValueChange={(next) => next && setDifficulty(next)}
			>
				{DIFFICULTIES.map((value) => (
					<ListboxOption key={value} value={value}>
						<ListboxLabel>{DIFFICULTY_LABELS[value]}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}
