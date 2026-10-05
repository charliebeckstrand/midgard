import { Segment, SegmentControl, SegmentItem, type SegmentProps } from 'ui/segment'

export default function SegmentPlayground(props: SegmentProps) {
	return (
		<Segment defaultValue="list" {...props}>
			<SegmentControl aria-label="View">
				<SegmentItem value="list">List</SegmentItem>
				<SegmentItem value="board">Board</SegmentItem>
				<SegmentItem value="calendar">Calendar</SegmentItem>
			</SegmentControl>
		</Segment>
	)
}
