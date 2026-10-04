'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { type ReactElement, useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Icon } from 'ui/icon'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { Flex } from 'ui/structure/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { useDeletePicks, usePicks, useSavePicks } from '../../queries/picks-queries'
import type { SeasonPicks, Week } from '../../types'
import { PREDICT_PARAM, predictValue, readPredictValue } from '../../utilities/predict-param'
import { PredictionSheet } from '../prediction-sheet'

/** The days of a week, such as `Sep 9 – 15`, in the time zone of the reader. */
const rangeFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

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

/** An icon button with its label in a tooltip. */
function ActionButton({
	label,
	color,
	icon,
	disabled,
	onClick,
}: {
	label: string
	color: 'zinc' | 'blue' | 'red'
	icon: ReactElement
	disabled?: boolean
	onClick: () => void
}) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					color={color}
					aria-label={label}
					disabled={disabled}
					onClick={onClick}
				>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>

			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

type ScheduleListProps = {
	season: number
	weeks: Week[]
	/** The picks of the season that the page read on the server. */
	picks: SeasonPicks
	/** The weeks that have kicked off, whose prediction can no longer be deleted. */
	started: number[]
}

/**
 * The weeks of the season, each a link to its games. A week with no
 * prediction has an Add button. A week with one has an Edit button and a
 * Delete button, which is disabled from the first kickoff of the week. `?predict=w5` opens the form on week 5.
 */
export function ScheduleList({ season, weeks, picks: initial, started }: ScheduleListProps) {
	const { data: picks } = usePicks(season, initial)

	const savePicks = useSavePicks(season)

	const deletePicks = useDeletePicks(season)

	const predicting = readPredictValue(useSearchParams().get(PREDICT_PARAM))

	const predictingWeek = weeks.find((week) => week.number === predicting) ?? null

	const [deleting, setDeleting] = useState<Week | null>(null)

	return (
		<>
			<List
				items={weeks}
				getKey={(week) => String(week.number)}
				sortable={false}
				aria-label="Weeks"
			>
				{(week) => {
					const predicted = picks[week.number] !== undefined

					return (
						<ListItem
							href={`/week/${week.number}`}
							suffix={
								<Flex gap="sm">
									{predicted ? (
										<>
											<ActionButton
												label="Edit prediction"
												color="blue"
												icon={<Pencil />}
												onClick={() => writePredict(week.number)}
											/>

											<ActionButton
												label="Delete prediction"
												color="red"
												icon={<Trash2 />}
												disabled={started.includes(week.number)}
												onClick={() => setDeleting(week)}
											/>
										</>
									) : (
										<ActionButton
											label="Add prediction"
											color="zinc"
											icon={<Plus />}
											onClick={() => writePredict(week.number)}
										/>
									)}
								</Flex>
							}
						>
							<ListLabel>{week.label}</ListLabel>

							<ListDescription>
								{rangeFormat.formatRange(new Date(week.start), new Date(week.end))}
							</ListDescription>
						</ListItem>
					)
				}}
			</List>

			<PredictionSheet
				season={season}
				week={predictingWeek}
				picks={predictingWeek === null ? undefined : picks[predictingWeek.number]}
				onOpenChange={(open) => {
					if (!open) writePredict(null)
				}}
				onSubmit={(week, next) => savePicks.mutateAsync({ week, picks: next })}
			/>

			{/* A delete cannot be undone, so it asks first, and names the week. */}
			<Confirm
				open={deleting !== null}
				onOpenChange={(next) => {
					if (!next) setDeleting(null)
				}}
				onConfirm={() => {
					if (deleting !== null) void deletePicks.mutateAsync(deleting.number)

					setDeleting(null)
				}}
				title={deleting === null ? '' : `Delete the prediction for ${deleting.label}?`}
				description={deleting === null ? undefined : 'This cannot be undone.'}
				confirm={{ label: 'Delete', color: 'red' }}
			/>
		</>
	)
}
