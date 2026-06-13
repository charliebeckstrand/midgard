import { TabList, type TabListProps } from '../tabs'

/** Props for {@link SegmentControl}: identical to {@link TabListProps}. */
export type SegmentControlProps = TabListProps

/** The selectable strip of a {@link Segment}: a preset over `<TabList>` holding the segment items. */
export function SegmentControl(props: SegmentControlProps) {
	return <TabList {...props} />
}
