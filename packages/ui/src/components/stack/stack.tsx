import { Flex, type FlexProps } from '../flex'

/** Props for {@link Stack}: identical to {@link FlexProps}, with `direction` fixed to `col`. */
export type StackProps = FlexProps

/**
 * Vertical flex container. Shorthand for Flex with column direction:
 * children stretch across the inline axis and `gap` is explicit, matching
 * Flex. Static leaf: renders in React Server Components.
 */
export function Stack(props: StackProps) {
	return <Flex data-slot="stack" direction="col" {...props} />
}
