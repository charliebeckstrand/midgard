import { FlexBase, type FlexProps } from '../flex/component'

export type StackProps = FlexProps

/** Vertical flex container. Shorthand for Flex with column direction and gap. */
export function Stack({
	direction = 'col',
	gap = 4,
	...props
}: StackProps) {
	return <FlexBase dataSlot="stack" direction={direction} gap={gap} {...props} />
}
