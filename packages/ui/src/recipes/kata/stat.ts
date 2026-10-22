import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, iro, ji, kokkaku, narabi } from '../kiso'

const { text } = iro
const { weight } = ji
const { flex } = narabi

// Each text is a ramp, so each slot takes the step of its nearest density
// scope. An explicit `size` on StatValue makes the value its own scope.
const label = [...text.muted, weight.medium, dan.text.small]

const value = {
	base: [weight.semibold, 'tracking-tight tabular-nums', ...text.default, dan.text.h1],
}

const delta = {
	base: [flex.inline, dan.text.small, dan.gap.scale.xs, weight.medium, 'tabular-nums'],
	trend: {
		up: text.success,
		down: text.error,
		neutral: text.muted,
	},
}

export const k = defineKata(
	{
		base: [flex.col, 'justify-center', 'h-full', dan.gap.scale.xs],
		slots: {
			label,
			value,
			delta,
			description: [dan.text.small, ...text.muted],
		},
		defaults: { trend: 'neutral' },
	},
	{ skeleton: kokkaku.stat },
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
/** Recipe variant props for {@link StatDelta}: its styling axes (`trend`), for consumers composing custom slots. */
export type StatDeltaVariants = {
	/**
	 * The direction of the change, which sets the color: the success color for
	 * `up`, the error color for `down`, and the muted color for `neutral`.
	 * @defaultValue 'neutral'
	 */
	trend?: VariantProps<typeof k>['trend']
}
