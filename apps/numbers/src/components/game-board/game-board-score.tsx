import { cn } from 'ui/core'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Text } from 'ui/text'
import { countPlaced, type Game, type Outcome, SLOTS } from '../../utilities/game'

/** The tint of a score cell: green for the winner, and amber for a tie. */
type Tint = 'green' | 'amber' | undefined

/** The label and the tint of the cell of the player and of the CPU, while the game goes on and for each result. */
const RESULTS: Record<Outcome | 'playing', { player: [string, Tint]; cpu: [string, Tint] }> = {
	playing: { player: ['You', undefined], cpu: ['CPU', undefined] },
	win: { player: ['You win', 'green'], cpu: ['CPU', undefined] },
	loss: { player: ['You', undefined], cpu: ['CPU wins', 'green'] },
	tie: { player: ['Tie', 'amber'], cpu: ['Tie', 'amber'] },
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

/** Props for {@link GameBoardScore}. */
export type GameBoardScoreProps = {
	game: Game
	/** The game of the CPU, against the player. The bar then shows a score for each, under its column. */
	cpu?: Game | null
	/** The result against the CPU, after the game of the player ends. */
	outcome?: Outcome | null
}

/**
 * The bar of the score: the count of the filled slots, of 20. The bar is at the
 * bottom of the view, under the box of the slots, and it has the look of the
 * bar of the number at the top. Against the CPU, the bar has a score under
 * each column. After the end, the score of the winner is green and reads
 * "You win" or "CPU wins", and a tie makes both amber.
 *
 * @remarks
 * The page box is the height of the visible area (`h-dvh`), so the bottom of
 * the box is above the toolbar of Safari and of Chrome. The bar has 1rem of
 * space on each side: the side padding, the bottom padding (or the inset of
 * the home indicator when that is larger), and the top padding above it, where
 * the slots scroll out of the box.
 */
export function GameBoardScore({ game, cpu, outcome }: GameBoardScoreProps) {
	const { player, cpu: opponent } = RESULTS[outcome ?? 'playing']

	return (
		<div className="mx-auto w-full max-w-md shrink-0 px-4 pt-4 pb-[max(--spacing(4),env(safe-area-inset-bottom))]">
			{cpu ? (
				<Columns columns={2} gap="sm">
					<ScoreCell label={player[0]} tint={player[1]} game={game} />
					<ScoreCell label={opponent[0]} tint={opponent[1]} game={cpu} />
				</Columns>
			) : (
				<ScoreCell label="Score" game={game} />
			)}
		</div>
	)
}
