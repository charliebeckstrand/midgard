import { Tab, type TabProps } from '../tabs'

/**
 * Props for {@link SegmentItem}: a required `value` plus `className`/`children`/`disabled`/`lockable`
 * from {@link TabProps}, and `aria-label` and `aria-keyshortcuts`.
 */
export type SegmentItemProps = Pick<
	TabProps,
	'className' | 'children' | 'disabled' | 'lockable' | 'aria-label' | 'aria-keyshortcuts'
> & {
	/** The key of the item. The item is selected when it matches the `value` of the SegmentControl. */
	value: string
}

/**
 * A single selectable option within a {@link SegmentControl}: a preset over
 * `<Tab>` keyed by `value`. Set `lockable` on an item that writes a value, so
 * that it locks in a locked scope, such as a `Form` while a submit runs. Set
 * `aria-label` where the visible label is short, such as "H1" for "Heading 1".
 */
export function SegmentItem(props: SegmentItemProps) {
	return <Tab {...props} />
}
