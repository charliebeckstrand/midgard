import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardHeader}; a slotted `<div>` that accepts `render` for composition. */
export type CardHeaderProps = SlotProps<'div'>

/**
 * Header region of a {@link Card}, typically holding a {@link CardTitle} and
 * {@link CardDescription}. Carries md padding; a non-md `<Card size>` overrides
 * it through the card's section projection.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export function CardHeader({ className, ...props }: CardHeaderProps) {
	return (
		<div
			data-slot="card-header"
			className={cn(k.headerPadding.md, k.header, className)}
			{...props}
		/>
	)
}
