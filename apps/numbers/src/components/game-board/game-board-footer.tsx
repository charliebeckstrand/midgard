import { CircleCheck } from 'lucide-react'
import { cn } from 'ui/core'
import { Icon } from 'ui/icon'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import {
	countPlaced,
	DIFFICULTY_LABELS,
	type Difficulty,
	type Game,
	type Outcome,
	SLOTS,
} from '../../utilities/game'
import { SETTINGS } from '../../utilities/settings'
import { GameBoardShare } from './game-board-share'

/** The tint of a score cell: green for the winner, and amber for a tie. */
type Tint = 'green' | 'amber' | undefined

/** The tint of the cell of the player and of the CPU, while the game goes on and for each result. */
const TINTS: Record<Outcome | 'playing', { player: Tint; cpu: Tint }> = {
	playing: { player: undefined, cpu: undefined },
	win: { player: 'green', cpu: undefined },
	loss: { player: undefined, cpu: 'green' },
	tie: { player: 'amber', cpu: 'amber' },
}

/** The name of the CPU in its label: "CPU" at the default level, and "CPU (Easy)" or "CPU (Hard)" else. */
function cpuName(difficulty: Difficulty): string {
	return difficulty === SETTINGS.difficulty.fallback
		? 'CPU'
		: `CPU (${DIFFICULTY_LABELS[difficulty]})`
}

/** Props for {@link ScoreCell}. */
type ScoreCellProps = {
	label: string
	/**
	 * Shows the label. A hidden label is only for a screen reader, and the
	 * score is then at the start of the cell.
	 */
	showLabel?: boolean
	game: Game
	tint?: Tint
	/**
	 * Gives the cell side padding, for a tint. With no tint in the bar, the
	 * cell has no side padding, so the score is flush with the slots.
	 */
	inset?: boolean
	/** Shows a check before the label: green for the winner, and muted grey for the loser. */
	check?: boolean
}

/**
 * One score: a label, and the count of the filled slots of `game`, of 20. The
 * cell has no paint while the game goes on. The cell of the winner is green,
 * and a tie makes it amber. With no tint in the bar, the cell has no side
 * padding, so the score is flush with the slots, as the drawn number is. A
 * tint gives each cell of the bar its side padding, so the cells align.
 */
function ScoreCell({
	label,
	showLabel = true,
	game,
	tint,
	inset = false,
	check = false,
}: ScoreCellProps) {
	return (
		<Flex
			align="center"
			justify={showLabel ? 'between' : 'start'}
			gap="sm"
			className={cn(
				'rounded-lg py-2.5',
				inset && 'px-4',
				tint === 'green' && 'bg-green-600/15 dark:bg-green-500/20',
				tint === 'amber' && 'bg-amber-500/20 dark:bg-amber-400/20',
			)}
		>
			{(check || showLabel) && (
				<Flex align="center" gap="sm" className="min-w-0">
					{check && (
						<Icon
							icon={<CircleCheck />}
							label={tint === 'green' ? 'Winner' : undefined}
							className={cn(
								'shrink-0',
								tint === 'green'
									? 'text-green-600 dark:text-green-500'
									: 'text-zinc-500 dark:text-zinc-400',
							)}
						/>
					)}

					{showLabel && (
						<Text as="span" tone="muted" className="truncate font-medium text-sm">
							{label}
						</Text>
					)}
				</Flex>
			)}

			<Text as="span" className="font-semibold text-xl tabular-nums">
				{!showLabel && <span className="sr-only">{`${label} `}</span>}
				{countPlaced(game.slots)}
				<Text as="span" tone="muted" className="font-medium text-base">
					{` / ${SLOTS}`}
				</Text>
			</Text>
		</Flex>
	)
}

/** Props for {@link GameBoardFooter}. */
export type GameBoardFooterProps = {
	game: Game
	/** Shows the score of the player. Against the CPU, the scores show at each setting. */
	showScore: boolean
	/** The game of the CPU, against the player. The bar then shows both scores, the player above the CPU. */
	cpu?: Game | null
	/** The level of the CPU, which its label names, so a screenshot shows it. */
	difficulty: Difficulty
	/** The result against the CPU, after the game of the player ends. */
	outcome?: Outcome | null
}

/**
 * The bar at the bottom of the view, under the box of the slots: the score, and
 * the share menu at the right, with a gap between them. The score is the count
 * of the filled slots, of 20, at the start of the bar. The bar has no paint,
 * as the bar of the number at the top has none. The label "Score" is only for
 * a screen reader. Against the CPU, the bar has the score of the player above the
 * score of the CPU. Away from the default level, the label of the CPU names
 * its level, such as "CPU (Hard)". When one side wins, each label gets a
 * check before it: the cell and the check of the winner are green, and the
 * check of the loser is grey. A tie makes both cells amber, with no check.
 * A solo win makes the cell green, with a green check, as the winner against
 * the CPU. With Show score off, the bar holds only the share menu.
 *
 * @remarks
 * A border at the top of the bar spans the width of the view, as the border
 * under the header does. The page box is the height of the visible area
 * (`h-dvh`), so the bottom of the box is above the toolbar of Safari and of
 * Chrome. The bar has 1rem of
 * space on each side: the side padding, the bottom padding (or the inset of
 * the home indicator when that is larger), and the top padding above it, where
 * the slots scroll out of the box.
 */
export function GameBoardFooter({
	game,
	showScore,
	cpu,
	difficulty,
	outcome,
}: GameBoardFooterProps) {
	const tints = TINTS[outcome ?? 'playing']

	// A win or a loss puts a check before each label.
	const decided = outcome === 'win' || outcome === 'loss'

	// A solo win fills each slot.
	const won = countPlaced(game.slots) === SLOTS

	// A result tints a cell, so each cell of the bar gets its side padding.
	const settled = Boolean(outcome)

	return (
		<div className="shrink-0 border-t border-zinc-950/5 dark:border-white/5">
			<Flex
				align="center"
				gap="sm"
				className="mx-auto w-full max-w-md px-4 pt-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))]"
			>
				<div className="min-w-0 flex-1">
					{cpu ? (
						<Stack gap="sm">
							<ScoreCell
								label="You"
								tint={tints.player}
								inset={settled}
								game={game}
								check={decided}
							/>
							<ScoreCell
								label={cpuName(difficulty)}
								tint={tints.cpu}
								inset={settled}
								game={cpu}
								check={decided}
							/>
						</Stack>
					) : (
						showScore && (
							<ScoreCell
								label="Score"
								showLabel={false}
								game={game}
								tint={won ? 'green' : undefined}
								inset={won}
								check={won}
							/>
						)
					)}
				</div>

				<GameBoardShare />
			</Flex>
		</div>
	)
}
