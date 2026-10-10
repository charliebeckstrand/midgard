import { Fragment } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'
import type { StepperLayout } from './context'

/** Props for {@link StepperSkeleton}: the placeholder step count and the `orientation` of the stepper. */
export type StepperSkeletonProps = {
	/**
	 * Step placeholders to render.
	 * @defaultValue 3
	 */
	steps?: number
	/**
	 * The orientation of the stepper it stands in for. `'responsive'` is
	 * vertical below `sm`, and horizontal from it, as on Stepper.
	 * @defaultValue 'responsive'
	 */
	orientation?: StepperLayout
	className?: string
}

/**
 * Stepper-shaped placeholder: indicator dots with title lines, joined by the
 * real separator rule. The root, the steps, the separators, and the title
 * offset come from the stepper recipes, so each layout matches the real
 * stepper. Keyed off the step count rather than a size step; it does not use
 * the size-driven `createSkeleton` factory.
 *
 * @remarks
 * `steps` sets the silhouette's segment count; match it to the expected step
 * count so the placeholder mirrors the loaded stepper's footprint.
 *
 * @see {@link Stepper}
 */
export function StepperSkeleton({ steps = 3, orientation, className }: StepperSkeletonProps) {
	const stepKeys = rangeKeys(steps, 'step')

	const layout = orientation ?? 'responsive'

	const title = <Placeholder className={cn(k.title({ orientation: layout }), k.skeleton.title)} />

	return (
		<div className={cn(k.base({ orientation: layout }), className)}>
			{stepKeys.map((stepKey, index) => (
				<Fragment key={stepKey}>
					{index > 0 && <div className={k.separator({ orientation: layout })} />}
					<div className={cn(k.step({ orientation: layout }), 'cursor-default')}>
						<Placeholder className={cn(k.skeleton.indicator)} />
						{layout === 'horizontal' ? (
							title
						) : (
							<div className={cn(k.content.base, layout === 'responsive' && k.content.responsive)}>
								{title}
							</div>
						)}
					</div>
				</Fragment>
			))}
		</div>
	)
}
