import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardBody}; a slotted `<div>` that accepts `render` for composition. */
export type CardBodyProps = SlotProps<'div'>

/**
 * Static leaf: renders in React Server Components. Carries md padding; a
 * non-md `<Card size>` overrides it through the card's section projection.
 */
export function CardBody({ className, ...props }: CardBodyProps) {
	return <div data-slot="card-body" className={cn(k.bodyPadding.md, className)} {...props} />
}
