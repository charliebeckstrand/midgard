'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { cn } from 'ui/core'
import { Form, type SubmitResult } from 'ui/form'
import { Icon } from 'ui/icon'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { useWeekGames } from '../../queries/picks-queries'
import type { Game, TeamPicks, Week, WeekPicks } from '../../types'
import { isLocked, isOff } from '../../utilities/locks'
import { PickField } from './pick-field'

/** The picked team of each game, by game id. */
type PickValues = Record<string, string | undefined>

/** Props for {@link PredictionSheet}. */
export type PredictionSheetProps = {
	season: number
	/** The week the sheet is open on, or `null` while it is closed. */
	week: Week | null
	/** The stored picks of the week, or `undefined` for a week with no prediction. */
	picks: WeekPicks | undefined
	onOpenChange: (open: boolean) => void
	onSubmit: (week: number, picks: TeamPicks) => Promise<unknown>
}

/**
 * The games of `games` that have no pick in `values` but can still take one,
 * as field errors. A prediction picks every game that has not kicked off.
 */
function missingPicks(games: Game[], values: PickValues): Record<string, string> | null {
	const now = Date.now()

	const missing = games.filter((game) => !isLocked(game, now) && values[game.id] === undefined)

	if (missing.length === 0) return null

	return Object.fromEntries(missing.map((game) => [game.id, 'Pick a side.']))
}

/** The picks of `values` that name a team, which is what the form sends. */
function toPicks(values: PickValues): TeamPicks {
	return Object.fromEntries(
		Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined),
	)
}

/**
 * The number of new or changed picks in `values` on open games that have no
 * line yet. Their points are not known until the closing line.
 */
function linelessPicks(games: Game[], values: PickValues, stored: WeekPicks | undefined): number {
	const now = Date.now()

	return games.filter((game) => {
		const team = values[game.id]

		return (
			game.spread === null &&
			!isLocked(game, now) &&
			team !== undefined &&
			stored?.[game.id]?.team !== team
		)
	}).length
}

/** The words of {@link LinelessConfirm} for `count` picks. */
function linelessCopy(count: number): { title: string; body: string } {
	if (count === 1) {
		return {
			title: 'Line still pending',
			body: "The sportsbooks haven't posted a line for one of your picks, so its points can't be estimated yet. It will be scored on the closing line once the game is settled.",
		}
	}

	return {
		title: 'Lines still pending',
		body: `The sportsbooks haven't posted lines for ${count} of your picks, so their points can't be estimated yet. Each will be scored on its closing line once the game is settled.`,
	}
}

/**
 * A save that waits on {@link LinelessConfirm}: its values, and the number of
 * its new picks on games that have no line yet. A cancel or a confirm clears
 * `open` and keeps the count, so the words stay the same while the dialog
 * closes.
 */
type PendingSave = { values: PickValues; count: number; open: boolean }

/** The confirmation of a save with new picks on games that have no line yet. */
function LinelessConfirm({
	pending,
	label,
	onCancel,
	onConfirm,
}: {
	pending: PendingSave | null
	label: string
	onCancel: () => void
	onConfirm: () => void
}) {
	const copy = linelessCopy(pending?.count ?? 0)

	return (
		<Confirm
			open={pending?.open ?? false}
			onOpenChange={(next) => {
				if (!next) onCancel()
			}}
			onConfirm={onConfirm}
			title={copy.title}
			description={copy.body}
			confirm={{ label }}
			cancel={{ label: 'Keep editing' }}
		/>
	)
}

/**
 * The fields of a prediction: a note on the points, the error of the last
 * save, and a {@link PickField} for each game, over the buttons of the sheet.
 */
function PredictionForm({
	games,
	picks,
	editing,
	action,
	failure,
	onSubmit,
	onCancel,
}: {
	games: Game[]
	picks: WeekPicks | undefined
	editing: boolean
	/** The label of the button that saves. */
	action: string
	failure: string | null
	onSubmit: (values: PickValues) => Promise<SubmitResult<PickValues> | undefined>
	onCancel: () => void
}) {
	return (
		<Form<PickValues>
			defaultValues={Object.fromEntries(
				Object.entries(picks ?? {}).map(([id, pick]) => [id, pick.team]),
			)}
			onSubmit={onSubmit}
		>
			<SheetBody>
				<Stack gap="lg" className="pb-6">
					<Text tone="muted" size="sm">
						Pick the winner of each game. A favorite is worth 1 point. An underdog is worth 1 more
						for each 3 points it gets.
					</Text>

					{failure === null ? null : (
						<Alert severity="error">
							<Text>{failure}</Text>
						</Alert>
					)}

					{/* One grid for all the games, so their sides line up. A week with a game that is off adds a column for its badge. */}
					<div
						className={cn('grid gap-3', games.some(isOff) ? 'grid-cols-[1fr_auto]' : 'grid-cols-1')}
					>
						{games.map((game) => (
							<PickField key={game.id} game={game} />
						))}
					</div>
				</Stack>
			</SheetBody>

			<SheetFooter>
				<Flex gap="sm" justify="end" full>
					<Button variant="plain" type="button" onClick={onCancel}>
						Cancel
					</Button>

					<Button type="submit" color={editing ? 'blue' : undefined}>
						{action}
					</Button>
				</Flex>
			</SheetFooter>
		</Form>
	)
}

/**
 * The form of a prediction, in a sheet: a pick of the winner of each game of
 * the week, in kickoff order. A game that has kicked off keeps its pick. It
 * opens on a week with no prediction to add one, and on a week with one to
 * edit it. A save with new picks on games that have no line yet asks first.
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

	const [pending, setPending] = useState<PendingSave | null>(null)

	useEffect(() => {
		if (week === null) return

		setHeld(week)

		setFailure(null)

		setPending(null)
	}, [week])

	const shown = week ?? held

	const editing = picks !== undefined

	const title = `${editing ? 'Edit' : 'Add'} prediction`

	const action = editing ? 'Save changes' : 'Add prediction'

	const games = useWeekGames(season, shown?.number ?? null)

	const save = async (values: PickValues) => {
		if (shown === null || games.data === undefined) return

		setFailure(null)

		try {
			await onSubmit(shown.number, toPicks(values))
		} catch (error) {
			setFailure(error instanceof Error ? error.message : String(error))

			return
		}

		onOpenChange(false)
	}

	const submit = async (values: PickValues): Promise<SubmitResult<PickValues> | undefined> => {
		if (games.data === undefined) return undefined

		const fieldErrors = missingPicks(games.data, values)

		if (fieldErrors !== null) {
			setFailure('Pick a side in every game that has not kicked off.')

			return { fieldErrors }
		}

		setFailure(null)

		const count = linelessPicks(games.data, values, picks)

		if (count > 0) setPending({ values, count, open: true })
		else await save(values)

		return undefined
	}

	const closeConfirm = () => setPending((held) => (held === null ? null : { ...held, open: false }))

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel glass aria-label={title}>
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
					<PredictionForm
						// Keyed on the week and the open state, so each open seeds from the
						// stored picks and an abandoned entry never comes back.
						key={`${String(open)}:${shown?.number}`}
						games={games.data}
						picks={picks}
						editing={editing}
						action={action}
						failure={failure}
						onSubmit={submit}
						onCancel={() => onOpenChange(false)}
					/>
				)}

				<LinelessConfirm
					pending={pending}
					label={action}
					onCancel={closeConfirm}
					onConfirm={() => {
						closeConfirm()

						if (pending !== null) void save(pending.values)
					}}
				/>
			</SheetPanel>
		</Sheet>
	)
}
