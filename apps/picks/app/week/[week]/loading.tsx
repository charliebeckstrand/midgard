import { Container } from 'ui/structure/container'
import { GameCardSkeleton, GameGrid } from '@/components/game-card'
import { WeekHeaderSkeleton } from '@/components/picks-header'

/** The number of game cards that the skeleton shows: a full row at each width. */
const CARDS = 6

/**
 * A week while it loads. The page reads the session, the games, and the picks
 * before it renders, so a navigation shows this shape at once in its place.
 */
export default function Loading() {
	return (
		<>
			<WeekHeaderSkeleton />

			{/* A screen reader does not read the skeletons, so the region tells it that the week loads. */}
			<Container size="full" padding="lg" className="p-6" aria-busy="true">
				<GameGrid>
					{Array.from({ length: CARDS }, (_, index) => (
						<GameCardSkeleton key={index} />
					))}
				</GameGrid>
			</Container>
		</>
	)
}
