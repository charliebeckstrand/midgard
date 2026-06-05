import { TabList, type TabListProps } from '../tabs'

export type SegmentControlProps = TabListProps

export function SegmentControl(props: SegmentControlProps) {
	return <TabList {...props} />
}
