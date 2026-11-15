import { Text } from 'ui/text'
import { countPlaced, type Game, SLOTS } from '../../utilities/game'

/** Props for {@link GameBoardScore}. */
export type GameBoardScoreProps = {
	game: Game
}

/**
 * The bar of the score: the count of the filled slots, of 20. The bar is at the
 * bottom of the view, under the box of the slots, and it has the look of the
 * bar of the number at the top.
 *
 * @remarks
 * The page box is the height of the visible area (`h-dvh`), so the bottom of
 * the box is above the toolbar of Safari and of Chrome. The bottom padding is
 * 1rem, or the inset of the home indicator when that is larger, so the bar is
 * not against the edge of the box.
 */
export function GameBoardScore({ game }: GameBoardScoreProps) {
	const placed = countPlaced(game.slots)

	return (
		<div className="mx-auto w-full max-w-md shrink-0 px-4 pt-2 pb-[max(--spacing(4),env(safe-area-inset-bottom))]">
			<div className="flex items-baseline justify-between rounded-lg bg-zinc-950/5 px-4 py-2.5 dark:bg-white/10">
				<Text as="span" tone="muted" className="font-medium text-sm">
					Score
				</Text>

				<Text as="span" className="font-semibold text-lg tabular-nums">
					{placed}
					<Text as="span" tone="muted" className="font-medium text-sm">
						{` / ${SLOTS}`}
					</Text>
				</Text>
			</div>
		</div>
	)
}
