import { useConcentric } from '../../primitives'
import { FlexBase, type FlexProps } from '../flex'

export type StackProps = FlexProps

/**
 * Vertical flex container. Shorthand for Flex with column direction.
 *
 * `gap` resolves through `explicit ?? Concentric ?? 'lg'` — so a Stack inside
 * `<Density density="compact">` (or any Concentric provider) inherits the
 * matching spacing step without further wiring.
 */
export function Stack({ direction = 'col', gap, ...props }: StackProps) {
	const concentric = useConcentric()

	const resolvedGap = gap ?? concentric?.size ?? 'lg'

	return <FlexBase dataSlot="stack" direction={direction} gap={resolvedGap} {...props} />
}
