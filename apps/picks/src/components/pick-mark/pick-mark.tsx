'use client'

import { CircleCheck, CircleX } from 'lucide-react'
import { Icon } from 'ui/icon'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import type { Grade } from '../../utilities/grade'

/**
 * The glyph, the color, and the label of each state of a pick. A pick shows a
 * grey check until its game is settled. A tie stays grey. Only the pending
 * label names the pick, because the mark of a settled pick tells its result.
 */
const MARKS = {
	pending: { icon: <CircleCheck />, color: 'text-zinc-400 dark:text-zinc-500', label: 'Your pick' },
	tie: { icon: <CircleCheck />, color: 'text-zinc-400 dark:text-zinc-500', label: 'Tie' },
	right: { icon: <CircleCheck />, color: 'text-green-600 dark:text-green-500', label: 'Correct' },
	wrong: { icon: <CircleX />, color: 'text-red-600 dark:text-red-500', label: 'Incorrect' },
} as const

/** `5 points`, or `1 point`. */
function pointsLabel(points: number) {
	return `${points} ${points === 1 ? 'point' : 'points'}`
}

/**
 * The mark beside a pick: a check, green where the pick won, or a red cross
 * where it did not. A tooltip names the state and, while the pick can still
 * score, its points, such as `Your pick · 4 points` or `Correct · 4 points`.
 * A screen reader also hears `Your pick` on a settled pick, because it does
 * not see the mark.
 */
export function PickMark({ grade, points }: { grade: Grade; points: number | null }) {
	const mark = MARKS[grade ?? 'pending']

	const scores = points !== null && (grade === null || grade === 'right')

	const label = scores ? `${mark.label} · ${pointsLabel(points)}` : mark.label

	const spoken = grade === null ? label : `Your pick · ${label}`

	return (
		<Tooltip>
			<TooltipTrigger>
				<span>
					<Icon icon={mark.icon} className={mark.color} />
					<span className="sr-only">{spoken}: </span>
				</span>
			</TooltipTrigger>

			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}
