import { Tab, type TabProps } from '../tabs'

/** Props for {@link SegmentItem}: a required `value` plus `className`/`children`/`disabled`/`lockable` from {@link TabProps}. */
export type SegmentItemProps = Pick<
	TabProps,
	'className' | 'children' | 'disabled' | 'lockable'
> & {
	value: string
}

/**
 * A single selectable option within a {@link SegmentControl}: a preset over
 * `<Tab>` keyed by `value`. Set `lockable` on an item that writes a value, so
 * that it locks in a locked scope, such as a `Form` while a submit runs.
 */
export function SegmentItem(props: SegmentItemProps) {
	return <Tab {...props} />
}
