import { cn } from '../../core'
import { type AccordionVariants, k } from '../../recipes/kata/accordion'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link AccordionSkeleton}: the item count and the `variant` of the accordion. */
export type AccordionSkeletonProps = AccordionVariants & {
	/**
	 * Collapsed item headers to render.
	 * @defaultValue 3
	 */
	items?: number
	className?: string
}

/**
 * Accordion-shaped placeholder: `items` collapsed items in the chrome of the
 * `variant`, each with a label line and an indicator square in the box of an
 * `AccordionTrigger`. Keyed off the item count, so it does not use the
 * size-driven `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. The header box
 * does not follow density, as the trigger does not. The indicator follows
 * the nearest density scope, as the chevron of the trigger does.
 * @see {@link Accordion}
 */
export function AccordionSkeleton({ items = 3, variant, className }: AccordionSkeletonProps) {
	const itemKeys = rangeKeys(items, 'item')

	return (
		<div className={cn(k({ variant }), className)}>
			{itemKeys.map((itemKey) => (
				<div key={itemKey} className={k.item({ variant })}>
					<div className={cn(k.header)}>
						<Placeholder className={k.skeleton.label} />
						<Placeholder className={cn(k.skeleton.indicator)} />
					</div>
				</div>
			))}
		</div>
	)
}
