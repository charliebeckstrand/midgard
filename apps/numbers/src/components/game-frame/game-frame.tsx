import { StackedLayout, StackedLayoutBody } from 'ui/layouts'
import { GameBoard } from '../game-board'
import { NumbersHeader } from '../numbers-header'

/** Props for {@link GameFrame}. */
export type GameFrameProps = {
	/** The seed of the run. */
	seed: string
}

/**
 * The page of a run: the header, and the game in the body. The column has the
 * height of the viewport, and the body scrolls under the header, so the
 * document is never taller than the screen (see `StackedLayout`).
 */
export function GameFrame({ seed }: GameFrameProps) {
	return (
		<StackedLayout className="h-dvh print:h-auto">
			<NumbersHeader />

			<StackedLayoutBody>
				<GameBoard seed={seed} />
			</StackedLayoutBody>
		</StackedLayout>
	)
}
