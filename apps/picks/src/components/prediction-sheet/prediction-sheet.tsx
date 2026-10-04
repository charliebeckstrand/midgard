'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Divider } from 'ui/divider'
import { Form, type SubmitResult } from 'ui/form'
import { Icon } from 'ui/icon'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetTitle } from 'ui/sheet'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { useWeekGames } from '../../queries/picks-queries'
import type { Game, Week, WeekPicks } from '../../types'
import { isLocked } from '../../utilities/locks'
import { PickField } from './pick-field'

type PickValues = Record<string, string | undefined>

/** Props for {@link PredictionSheet}. */
export type PredictionSheetProps = {
	season: number
	/** The week the sheet is open on, or `null` while it is closed. */
	week: Week | null
	/** The stored picks of the week, or `undefined` for a week with no prediction. */
	picks: WeekPicks | undefined
	onOpenChange: (open: boolean) => void
	onSubmit: (week: number, picks: WeekPicks) => Promise<unknown>
}

/**
 * The games of `games` that have no pick in `values` but can still take one,
 * as field errors. A prediction picks every game that has not kicked off.
 */
function missingPicks(games: Game[], values: PickValues): Record<string, string> | null {
	const now = Date.now()

	const missing = games.filter((game) => !isLocked(game, now) && values[game.id] === undefined)

	if (missing.length === 0) return null

	return Object.fromEntries(missing.map((game) => [game.id, 'Pick a winner.']))
}

/** The picks of `values` that name a team, which is what the store keeps. */
function toPicks(values: PickValues): WeekPicks {
	return Object.fromEntries(
		Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined),
	)
}

/**
 * The form of a prediction, in a sheet: a pick of the winner of each game of
 * the week. It opens on a week with no prediction to add one, and on a week
 * with one to edit it.
 */
export function PredictionSheet({
	season,
	week,
	picks,
	onOpenChange,
	onSubmit,
}: PredictionSheetProps) {
	const open = week !== null

	// The week the sheet last opened on. A close clears the week of the caller,
	// and the sheet stays mounted while it slides out, so it reads this one.
	const [held, setHeld] = useState(week)

	const [failure, setFailure] = useState<string | null>(null)

	useEffect(() => {
		if (week === null) return

		setHeld(week)

		setFailure(null)
	}, [week])

	const shown = week ?? held

	const editing = picks !== undefined

	const title = `${editing ? 'Edit' : 'Add'} prediction`

	const games = useWeekGames(season, shown?.number ?? null)

	return (
		<Sheet glass open={open} onOpenChange={onOpenChange} aria-label={title}>
			<Flex justify="between" align="center" gap="md" className="px-6 pt-6">
				<SheetTitle className="p-0">
					{shown === null ? title : `${title}: ${shown.label}`}
				</SheetTitle>

				<SheetClose>
					<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
				</SheetClose>
			</Flex>

			{games.data === undefined ? (
				<SheetBody>
					{games.error === null ? (
						<Text tone="muted">Loading the games…</Text>
					) : (
						<Alert severity="error">
							<Text>{games.error.message}</Text>
						</Alert>
					)}
				</SheetBody>
			) : (
				<Form<PickValues>
					// Keyed on the week and the open state, so each open seeds from the
					// stored picks and an abandoned entry never comes back.
					key={`${String(open)}:${shown?.number}`}
					defaultValues={{ ...picks }}
					onSubmit={async (values): Promise<SubmitResult<PickValues> | undefined> => {
						if (shown === null) return undefined

						const fieldErrors = missingPicks(games.data, values)

						if (fieldErrors !== null) return { fieldErrors }

						setFailure(null)

						try {
							await onSubmit(shown.number, toPicks(values))
						} catch (error) {
							setFailure(error instanceof Error ? error.message : String(error))

							return undefined
						}

						onOpenChange(false)

						return undefined
					}}
				>
					<SheetBody>
						<Stack gap="lg" className="pb-6">
							{games.data.map((game, at) => (
								<Stack key={game.id} gap="lg">
									{at > 0 ? <Divider /> : null}

									<PickField game={game} />
								</Stack>
							))}

							{failure === null ? null : (
								<Alert severity="error">
									<Text>{failure}</Text>
								</Alert>
							)}
						</Stack>
					</SheetBody>

					<SheetFooter>
						<Flex gap="sm" justify="end" full>
							<Button variant="plain" type="button" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>

							<Button type="submit" color={editing ? 'blue' : undefined}>
								{editing ? 'Save changes' : 'Add prediction'}
							</Button>
						</Flex>
					</SheetFooter>
				</Form>
			)}
		</Sheet>
	)
}
