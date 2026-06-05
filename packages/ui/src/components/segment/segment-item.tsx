import { Tab, type TabProps } from '../tabs'

export type SegmentItemProps = Pick<TabProps, 'className' | 'children' | 'disabled'> & {
	value: string
}

export function SegmentItem(props: SegmentItemProps) {
	return <Tab {...props} />
}
