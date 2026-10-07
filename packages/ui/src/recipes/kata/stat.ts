import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { flex } = narabi

// Each text is a ramp, so each slot takes the step of its nearest density
// scope. An explicit `size` on StatValue makes the value its own scope.
const label = [...text.muted, weight.medium, dan.text.small]

const value = defineRecipe({
	base: [weight.semibold, 'tracking-tight tabular-nums', ...text.default, dan.text.h1],
})

const delta = defineRecipe({
	base: [flex.inline, dan.text.small, dan.gap.scale.xs, weight.medium, 'tabular-nums'],
	trend: {
		up: text.success,
		down: text.error,
		neutral: text.muted,
	},
	defaults: { trend: 'neutral' },
})

export const k = defineRecipe(
	{
		base: [flex.col, 'justify-center', 'h-full', dan.gap.scale.xs],
		slots: {
			description: [dan.text.small, ...text.muted],
		},
		skeleton: kokkaku.stat,
	},
	{
		label,
		value,
		delta,
	},
)

/** The size scale of {@link StatValue}: the steps of its text. */
export const scale = defineScale(dan.text.h1)

/** Recipe variant props for {@link StatValue}: the `size` step that the component writes as a density scope. */
export type StatValueVariants = {
	/**
	 * The density step of the value text. Omit it to take the step of the
	 * nearest density scope. A step makes the value a density scope.
	 */
	size?: ScaleStep<typeof scale>
}
/** Recipe variant props for {@link StatDelta} — its styling axes (`trend`), for consumers composing custom slots. */
export type StatDeltaVariants = Omit<VariantProps<typeof delta>, 'trend'> & {
	/**
	 * The direction of the change, which sets the color: the success color for
	 * `up`, the error color for `down`, and the muted color for `neutral`.
	 * @defaultValue 'neutral'
	 */
	trend?: VariantProps<typeof delta>['trend']
}
