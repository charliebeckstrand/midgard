import { Flex, type FlexProps } from '../flex'

/** Props for {@link Stack}: identical to {@link FlexProps}, with `direction` defaulting to `col`. */
export type StackProps = FlexProps

/**
 * Vertical flex container: Flex with `direction` defaulting to `col` (a caller
 * can still pass `direction="row"` to lay out horizontally). Children stretch
 * across the inline axis and `gap` is explicit, matching Flex. Static leaf:
 * renders in React Server Components.
 *
 * @remarks
 * Unresolved by design, pending a maintainer call: Flex's own doc says "use Flex
 * for rows, Stack for columns", while `direction` here stays overridable and
 * eight demos pass `direction="row"`. Either Stack is a strict column — type-lock
 * `direction` and migrate those demos — or it is a col-defaulted Flex and the
 * Flex doc must say so. Settle the two together, not one at a time.
 */
export function Stack(props: StackProps) {
	return <Flex data-slot="stack" direction="col" {...props} />
}
