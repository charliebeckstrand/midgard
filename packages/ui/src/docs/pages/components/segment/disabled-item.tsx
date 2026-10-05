import { Segment, SegmentControl, SegmentItem } from 'ui/segment'

export default function DisabledItem() {
	return (
		<Segment defaultValue="list">
			<SegmentControl aria-label="View">
				<SegmentItem value="list">List</SegmentItem>
				<SegmentItem value="board">Board</SegmentItem>
				<SegmentItem value="map" disabled>
					Map
				</SegmentItem>
			</SegmentControl>
		</Segment>
	)
}
