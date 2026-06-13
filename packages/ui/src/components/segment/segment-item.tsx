import { Tab, type TabProps } from '../tabs'

/** Props for {@link SegmentItem}: a required `value` plus `className`/`children`/`disabled` from {@link TabProps}. */
export type SegmentItemProps = Pick<TabProps, 'className' | 'children' | 'disabled'> & {
	value: string
}

/** A single selectable option within a {@link SegmentControl}: a preset over `<Tab>` keyed by `value`. */
export function SegmentItem(props: SegmentItemProps) {
	return <Tab {...props} />
}
