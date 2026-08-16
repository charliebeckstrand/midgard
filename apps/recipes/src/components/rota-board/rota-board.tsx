'use client'

import { Check, Plus, X } from 'lucide-react'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from 'ui/kanban'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { dayLabel, today } from '../../utilities/day'
import type { DayColumn, DayEntries, PlanCard } from '../../utilities/plan-move'
import { resolveMove } from '../../utilities/plan-move'

/** One card on the board, with what the reader needs to read on it. */
export type BoardCard = PlanCard & {
	/** The recipe's name, or a stand-in where the recipe is no longer on file. */
	name: string
	/** Whether this meal has been ticked as cooked. */
	cooked: boolean
}

/** One day column of the board. */
export type BoardDay = {
	day: string
	cards: BoardCard[]
}

/** Props for {@link RotaBoard}. */
export type RotaBoardProps = {
	days: readonly BoardDay[]
	/** Fires with the days to write after a drop. See `plan-move.ts`. */
	onMove: (days: DayEntries[]) => void
	onAdd: (day: string) => void
	onCooked: (card: BoardCard, day: string) => void
	onRemove: (card: BoardCard) => void
}

/** The weekday a column names itself by, and the date under it. */
const WEEKDAY: Intl.DateTimeFormatOptions = { weekday: 'short' }

const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

/**
 * The week, as seven columns.
 *
 * A drop is read rather than taken as given. `Kanban` emits an insert, which
 * leaves one day holding two meals and the other holding none — right for a
 * board of backlogs, wrong for a week, where two days trading places is what the
 * reader meant. `resolveMove` works out which of the three it was and answers
 * with the days to write; see `utilities/plan-move.ts`.
 */
export function RotaBoard({ days, onMove, onAdd, onCooked, onRemove }: RotaBoardProps) {
	const now = today()

	const columns: DayColumn[] = days.map((entry) => ({
		id: entry.day,
		items: entry.cards,
	}))

	return (
		<Kanban<PlanCard, DayColumn>
			aria-label="The week"
			columns={columns}
			getKey={(card) => card.id}
			onReorder={(next) => {
				const moved = resolveMove(columns, next)

				if (moved.length > 0) onMove(moved)
			}}
		>
			{days.map((entry) => (
				<KanbanColumn
					key={entry.day}
					columnId={entry.day}
					// A week is seven days at once. The board's own column is a fixed
					// width that scrolls sideways, which is right for a wall of backlogs
					// and wrong here: a reader planning Thursday should not have to
					// scroll away from Monday to do it.
					className="w-auto min-w-0 shrink flex-1"
					aria-label={dayLabel(entry.day, { weekday: 'long', day: 'numeric', month: 'long' })}
				>
					<KanbanColumnHeader>
						<Flex justify="between" align="center" className="w-full min-w-0">
							<Flex direction="col" className="min-w-0">
								<KanbanColumnTitle
									// Today is the column a reader's eye goes to first, so it
									// says so rather than making them read seven dates.
									className={entry.day === now ? 'text-blue-600 dark:text-blue-400' : undefined}
								>
									{dayLabel(entry.day, WEEKDAY)}
								</KanbanColumnTitle>

								<Text className="text-xs text-zinc-500 dark:text-zinc-400">
									{dayLabel(entry.day, DATE)}
								</Text>
							</Flex>

							<Tooltip>
								<TooltipTrigger>
									<ToggleIconButton
										icon={<Icon icon={<Plus />} />}
										aria-label={`Add a meal to ${dayLabel(entry.day, DATE)}`}
										onClick={() => onAdd(entry.day)}
									/>
								</TooltipTrigger>

								<TooltipContent>Add a meal</TooltipContent>
							</Tooltip>
						</Flex>
					</KanbanColumnHeader>

					<KanbanColumnBody empty={<Text className="text-sm">Nothing planned</Text>}>
						{entry.cards.map((card) => (
							<KanbanCard key={card.id} cardId={card.id} aria-label={card.name}>
								<Flex justify="between" align="start" gap="xs" className="min-w-0">
									<Text
										className={
											card.cooked ? 'min-w-0 text-sm line-through opacity-60' : 'min-w-0 text-sm'
										}
									>
										{card.name}
									</Text>

									<Flex gap="xs" className="shrink-0">
										{/* The one control on the board that writes fact rather
									    than intent: a planned meal the reader skipped must
									    leave nothing behind, so nothing but this tick makes
									    a cook. */}
										<ToggleIconButton
											icon={<Icon icon={<Check />} />}
											color={card.cooked ? 'green' : undefined}
											aria-label={
												card.cooked ? `${card.name} was cooked` : `Mark ${card.name} cooked`
											}
											aria-pressed={card.cooked}
											onClick={() => onCooked(card, entry.day)}
										/>

										<ToggleIconButton
											icon={<Icon icon={<X />} />}
											aria-label={`Take ${card.name} off the plan`}
											onClick={() => onRemove(card)}
										/>
									</Flex>
								</Flex>
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}
