import { cn } from 'ui/core'
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

/**
 * The label and the tint of the cell of the player and of the CPU, while the
 * game goes on and for each result. The label of the CPU gets its name (see
 * {@link cpuName}).
 */
const RESULTS: Record<
	Outcome | 'playing',
	{ player: [string, Tint]; cpu: [(name: string) => string, Tint] }
> = {
	playing: { player: ['You', undefined], cpu: [(name) => name, undefined] },
	win: { player: ['You win', 'green'], cpu: [(name) => name, undefined] },
	loss: { player: ['You', undefined], cpu: [(name) => `${name} wins`, 'green'] },
	tie: { player: ['Tie', 'amber'], cpu: [() => 'Tie', 'amber'] },
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
	game: Game
	tint?: Tint
}

/** One score: a label, and the count of the filled slots of `game`, of 20. */
function ScoreCell({ label, game, tint }: ScoreCellProps) {
	return (
		<Flex
			align="baseline"
			justify="between"
			gap="sm"
			className={cn(
				'rounded-lg px-4 py-2.5',
				tint === 'green' && 'bg-green-600/15 dark:bg-green-500/20',
				tint === 'amber' && 'bg-amber-500/20 dark:bg-amber-400/20',
				!tint && 'bg-zinc-950/5 dark:bg-white/10',
			)}
		>
			<Text as="span" tone="muted" className="truncate font-medium text-sm">
				{label}
			</Text>

			<Text as="span" className="font-semibold text-lg tabular-nums">
				{countPlaced(game.slots)}
				<Text as="span" tone="muted" className="font-medium text-sm">
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
 * of the filled slots, of 20, and it has the look of the bar of the number at
 * the top. Against the CPU, the bar has the score of the player above the
 * score of the CPU. Away from the default level, the label of the CPU names
 * its level, such as "CPU (Hard)". After the end, the score of the winner is green and reads
 * "You win" or, for example, "CPU (Hard) wins", and a tie makes both amber.
 * With Show score off, the bar holds only the share menu.
 *
 * @remarks
 * The page box is the height of the visible area (`h-dvh`), so the bottom of
 * the box is above the toolbar of Safari and of Chrome. The bar has 1rem of
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
	const { player, cpu: opponent } = RESULTS[outcome ?? 'playing']

	return (
		<Flex
			align="center"
			gap="sm"
			className="mx-auto w-full max-w-md shrink-0 px-4 pt-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))]"
		>
			<div className="min-w-0 flex-1">
				{cpu ? (
					<Stack gap="sm">
						<ScoreCell label={player[0]} tint={player[1]} game={game} />
						<ScoreCell label={opponent[0](cpuName(difficulty))} tint={opponent[1]} game={cpu} />
					</Stack>
				) : (
					showScore && <ScoreCell label="Score" game={game} />
				)}
			</div>

			<GameBoardShare />
		</Flex>
	)
}
