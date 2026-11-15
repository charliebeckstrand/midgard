import { StackedLayout, StackedLayoutBody } from 'ui/layouts'
import { GameBoard } from '@/components/game-board'
import { NumbersHeader } from '@/components/numbers-header'

/**
 * The game. The column has the height of the viewport, and the body scrolls
 * under the header, so the document is never taller than the screen (see
 * `StackedLayout`).
 */
export default function Page() {
	return (
		<StackedLayout className="h-dvh print:h-auto">
			<NumbersHeader />

			<StackedLayoutBody>
				<GameBoard />
			</StackedLayoutBody>
		</StackedLayout>
	)
}
