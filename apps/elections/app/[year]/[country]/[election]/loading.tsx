import { HeadingSkeleton } from 'ui/heading'
import { MapSkeleton } from 'ui/map'
import { SegmentSkeleton } from 'ui/segment'
import { Container } from 'ui/structure/container'
import { Stack } from 'ui/structure/stack'

/**
 * A page of an election while it loads. The pages read the results before
 * they render, so a navigation shows this shape at once in their place: the
 * title, the office switch, and the frame of a map.
 */
export default function Loading() {
	return (
		// A screen reader does not read the skeletons, so the region tells it that the page loads.
		<Container size="lg" padding="lg" className="py-6" aria-busy="true">
			<Stack gap="xl">
				<Stack gap="lg">
					<HeadingSkeleton />

					<SegmentSkeleton />
				</Stack>

				<MapSkeleton projection="albers-usa" />
			</Stack>
		</Container>
	)
}
