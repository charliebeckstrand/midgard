import { cn } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

export type CardFooterProps = SlotProps<'div'>

/**
 * Static leaf: renders in React Server Components. Carries md padding and
 * gap; a non-md `<Card size>` overrides them through the card's section
 * projection.
 */
export function CardFooter({ className, ...props }: CardFooterProps) {
	return (
		<div
			data-slot="card-footer"
			className={cn(k.footerPadding.md, 'flex items-center', k.footerGap.md, className)}
			{...props}
		/>
	)
}
