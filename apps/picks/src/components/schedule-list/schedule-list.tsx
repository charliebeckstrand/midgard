'use client'

import { CircleAlert, Pencil, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { type ReactElement, type ReactNode, useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { useConfirm } from 'ui/confirm'
import { cn } from 'ui/core'
import { Label } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { useDateFormat } from 'ui/providers/locale'
import { Flex } from 'ui/structure/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { useDeletePicks, usePicks, useSavePicks } from '../../queries/picks-queries'
import type { SeasonPicks, Week } from '../../types'
import { formatRecord, recordColor, type Tally } from '../../utilities/grade'
import { PREDICT_PARAM, predictValue, readPredictValue } from '../../utilities/predict-param'
import { KickoffTime } from '../kickoff-time'
import { PredictionSheet } from '../prediction-sheet'

/** The days of a week, such as `Sep 9 – 15`. */
const DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

/**
 * Writes the week of the prediction form into the address, or takes it out.
 * Next patches `history.replaceState`, so `useSearchParams` reads the new
 * address and the server gets no request. A replace and not a push, so that
 * Back after a close does not open the form again.
 */
function writePredict(week: number | null) {
	const url = new URL(window.location.href)

	if (week === null) url.searchParams.delete(PREDICT_PARAM)
	else url.searchParams.set(PREDICT_PARAM, predictValue(week))

	window.history.replaceState(null, '', url)
}

/** An icon button with a tooltip, which is its `label` when it has no `tip`. */
function ActionButton({
	label,
	tip = label,
	color,
	icon,
	onClick,
}: {
	label: string
	tip?: ReactNode
	color: 'zinc' | 'blue' | 'red'
	icon: ReactElement
	onClick?: () => void
}) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button variant="bare" color={color} aria-label={label} onClick={onClick}>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>

			<TooltipContent>{tip}</TooltipContent>
		</Tooltip>
	)
}

/**
 * The buttons of a week, each only where it can act. A week that takes picks
 * has Add, or Edit once it has a prediction. A prediction deletes only before
 * the first kickoff of its week. A week that takes no more picks and has no
 * prediction shows a "No picks" badge.
 */
function WeekActions({
	predicted,
	started,
	closed,
	onPredict,
	onDelete,
}: {
	predicted: boolean
	started: boolean
	closed: boolean
	onPredict: () => void
	onDelete: () => void
}) {
	if (closed) {
		// A badge, as the record of a week is, so the row keeps the height of the others.
		return predicted ? null : (
			<Badge variant="soft" color="zinc">
				No picks
			</Badge>
		)
	}

	if (!predicted) {
		return <ActionButton label="Add prediction" color="zinc" icon={<Plus />} onClick={onPredict} />
	}

	return (
		<>
			<ActionButton label="Edit prediction" color="blue" icon={<Pencil />} onClick={onPredict} />

			{started ? null : (
				<ActionButton label="Delete prediction" color="red" icon={<Trash2 />} onClick={onDelete} />
			)}
		</>
	)
}

/** The next week to kick off, when its first kickoff is close. */
export type ClosingWeek = {
	week: number
	/** The first kickoff of the week, when its first pick locks. */
	kickoff: string
}

type ScheduleListProps = {
	season: number
	weeks: Week[]
	/** The picks of the season that the page read on the server. */
	picks: SeasonPicks
	/** The weeks that have kicked off, whose prediction can no longer be deleted. */
	started: number[]
	/** The weeks whose every game is locked, which take no more picks. */
	closed: number[]
	/** The record of each started week that has a prediction. */
	tallies: Record<number, Tally>
	/** The number of the week in play or next up, or `null` after the season. */
	current: number | null
	/** The next week to kick off, when it locks soon, or `null`. */
	closing: ClosingWeek | null
	/** The line above the weeks, such as the record of the season. */
	header?: ReactNode
}

/**
 * The weeks of the season, each a link to its games, with the record of each
 * started week and the buttons of {@link WeekActions}. The current week reads
 * "Current week". The next week to kick off shows an amber mark when its first
 * pick locks soon, with the time of the lock in its tooltip. The dates of the
 * weeks show only when the "Show dates" checkbox beside the `header` is on. On
 * a phone, the checkbox goes under the `header`.
 * `?predict=w5` opens the form on week 5.
 */
export function ScheduleList({
	season,
	weeks,
	picks: initial,
	started,
	closed,
	tallies,
	current,
	closing,
	header,
}: ScheduleListProps) {
	const { data: picks } = usePicks(season, initial)

	const savePicks = useSavePicks(season)

	const deletePicks = useDeletePicks(season)

	const predicting = readPredictValue(useSearchParams().get(PREDICT_PARAM))

	const predictingWeek = weeks.find((week) => week.number === predicting) ?? null

	const confirm = useConfirm()

	// A delete cannot be undone, so it asks first, and names the week.
	const remove = async (week: Week) => {
		const confirmed = await confirm({
			title: `Delete the prediction for ${week.label}?`,
			description: 'This cannot be undone.',
			confirm: { label: 'Delete', color: 'red' },
		})

		if (confirmed) deletePicks.mutate(week.number)
	}

	const [showDates, setShowDates] = useState(false)

	const range = useDateFormat(DAY)

	return (
		<>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{header}

				<CheckboxField className="sm:ms-auto">
					<Checkbox checked={showDates} onChange={(event) => setShowDates(event.target.checked)} />
					<Label>Show dates</Label>
				</CheckboxField>
			</div>

			<List items={weeks} getKey={(week) => String(week.number)} aria-label="Weeks">
				{(week) => {
					const predicted = picks[week.number] !== undefined

					const tally = tallies[week.number]

					const isClosed = closed.includes(week.number)

					return (
						<ListItem
							href={`/week/${week.number}`}
							// A predicted week rests on a step more solid than an open one.
							className={predicted ? 'bg-zinc-50 dark:bg-zinc-800/50' : undefined}
							suffix={
								<Flex gap="sm" align="center">
									{/* Outside the link of the row, so a hover reaches its tooltip. */}
									{closing?.week === week.number ? (
										<ActionButton
											label="Pick locks soon"
											tip={
												<>
													Pick locks <KickoffTime kickoff={closing.kickoff} />
												</>
											}
											color="zinc"
											icon={<CircleAlert className="text-amber-500 dark:text-amber-400" />}
										/>
									) : null}

									{tally === undefined ? null : (
										<Badge
											variant="solid"
											color={recordColor(tally)}
											// The space before the buttons, where the week still has them.
											className={cn('tabular-nums', !isClosed && 'me-2')}
										>
											{formatRecord(tally)}
										</Badge>
									)}

									<WeekActions
										predicted={predicted}
										started={started.includes(week.number)}
										closed={isClosed}
										onPredict={() => writePredict(week.number)}
										onDelete={() => void remove(week)}
									/>
								</Flex>
							}
						>
							<ListLabel className="flex items-center gap-2">
								{week.label}
								{/* The smallest step fits the line of the name, so the row keeps its height. */}
								{current === week.number ? (
									<Badge variant="soft" color="blue" size="xs">
										Current week
									</Badge>
								) : null}
							</ListLabel>

							{showDates ? (
								// One gap on every row keeps the dates clear of the badge of the current week.
								<ListDescription className="mt-1 text-zinc-500 dark:text-zinc-400">
									{range.formatRange(new Date(week.start), new Date(week.end))}
								</ListDescription>
							) : null}
						</ListItem>
					)
				}}
			</List>

			<PredictionSheet
				season={season}
				week={predictingWeek}
				picks={picks}
				onOpenChange={(open) => {
					if (!open) writePredict(null)
				}}
				onSubmit={(week, next) => savePicks.mutateAsync({ week, picks: next })}
			/>
		</>
	)
}
