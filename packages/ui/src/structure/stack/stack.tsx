import { Flex, type FlexProps } from '../flex'

/** Props for {@link Stack}: {@link FlexProps} without `direction`, which Stack fixes to `col`. */
export type StackProps = Omit<FlexProps, 'direction'>

/**
 * Vertical flex container: Flex with `direction` fixed to `col`. Use Flex
 * directly to lay out along the inline axis. Children stretch across the inline
 * axis and `gap` is explicit, matching Flex. Static leaf:
 * renders in React Server Components.
 */
export function Stack(props: StackProps) {
	return <Flex data-slot="stack" direction="col" {...props} />
}
