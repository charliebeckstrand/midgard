'use client'

import type { ReactElement } from 'react'
import { StatusDot } from 'ui/status'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import type { Game, Pick } from '../../types'
import { formatLine, pickLine, scoredLine } from '../../utilities/grade'

/** The amber dot of a game that has no line yet. */
export function PendingDot({ className }: { className?: string }) {
	return <StatusDot status="warning" label="Line pending" className={className} />
}

/**
 * A tooltip on hover of `children` that says the game has no line yet. The
 * trigger is the control that holds the {@link PendingDot}, because a control
 * takes the pointer from the elements in it.
 */
export function LinePending({ children }: { children: ReactElement }) {
	return (
		<Tooltip>
			<TooltipTrigger>{children}</TooltipTrigger>

			<TooltipContent>Line pending</TooltipContent>
		</Tooltip>
	)
}

/**
 * Why the line of a pick reads as it does, or `null` where the line is the
 * line of the game: the line of the pick against the line now, or the note
 * that the closing line scores a pick saved before the line posted.
 */
function lineNote(game: Game, pick: Pick): string | null {
	const now = pickLine(game, pick.team)

	const final = game.state === 'final'

	if (pick.line === null) return final ? null : 'Scored on the closing line'

	if (now === null || now === pick.line) return null

	return `Picked at ${formatLine(pick.line)} · ${final ? 'closed at' : 'now'} ${formatLine(now)}`
}

/**
 * The picked team and the line that scores the pick, such as `DET +7`. A
 * line with a note shows muted, and a tooltip on hover gives the note.
 * Without a line, the team shows with {@link PendingDot}.
 */
export function PickLine({ game, pick, team }: { game: Game; pick: Pick; team: string }) {
	const line = scoredLine(game, pick)

	if (line === null) {
		return (
			<>
				<span className="font-medium">{team}</span>
				<LinePending>
					<span>
						<PendingDot />
					</span>
				</LinePending>
			</>
		)
	}

	const note = lineNote(game, pick)

	if (note === null) return <span className="font-medium">{`${team} ${formatLine(line)}`}</span>

	return (
		<Tooltip>
			<TooltipTrigger>
				{/* The trigger makes its child a flex box, which drops the space. The span restates `inline` to keep it. */}
				<span className="inline font-medium">
					{team} <span className="text-zinc-500 dark:text-zinc-400">{formatLine(line)}</span>
					<span className="sr-only">. {note}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent>{note}</TooltipContent>
		</Tooltip>
	)
}
