'use client'

import { Label, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Radio, RadioField, RadioGroup } from 'ui/radio'
import { Stack } from 'ui/structure/stack'
import type { Game } from '../../types'

/**
 * The pick of one game: a radio for each team, bound to the form field named
 * by the id of the game. A game that has kicked off is locked, so its radios
 * are disabled and keep the pick that was stored.
 */
export function PickField({ game }: { game: Game }) {
	const { value, setValue } = useFormValue<string>(game.id, {})

	const locked = game.state !== 'scheduled'

	return (
		<Stack gap="xs">
			<RadioGroup aria-label={`${game.away.name} at ${game.home.name}`} className="gap-2">
				{[game.away, game.home].map((team) => (
					<RadioField key={team.id}>
						<Radio
							name={game.id}
							value={team.id}
							checked={value === team.id}
							disabled={locked}
							onChange={() => setValue(team.id)}
						/>

						<Label className="flex items-center gap-2">
							{team.logo === null ? null : (
								<img src={team.logo} alt="" className="size-6 shrink-0" />
							)}
							{team.name}
						</Label>
					</RadioField>
				))}
			</RadioGroup>

			<Message name={game.id} />
		</Stack>
	)
}
