import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

export type CardHeaderProps = SlotProps<'div'>

/**
 * Static leaf: renders in React Server Components. Carries md padding; a
 * non-md `<Card size>` overrides it through the card's section projection.
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
