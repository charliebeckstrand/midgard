import { Flex, type FlexProps } from '../flex'

/** Props for {@link Stack}: identical to {@link FlexProps}, with `direction` defaulting to `col`. */
export type StackProps = FlexProps

/**
 * Vertical flex container: Flex with `direction` defaulting to `col` (a caller
 * may still pass `direction="row"` to lay out horizontally). Children stretch
 * across the inline axis and `gap` is explicit, matching Flex. Static leaf:
 * renders in React Server Components.
 */
export function Stack(props: StackProps) {
	return <Flex data-slot="stack" direction="col" {...props} />
}
