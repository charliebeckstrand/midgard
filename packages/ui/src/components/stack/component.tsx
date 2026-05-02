import { FlexBase, type FlexProps } from '../flex'

export type StackProps = FlexProps

/** Vertical flex container. Shorthand for Flex with column direction and gap. */
export function Stack({ direction = 'col', gap = 'lg', ...props }: StackProps) {
	return <FlexBase dataSlot="stack" direction={direction} gap={gap} {...props} />
}
