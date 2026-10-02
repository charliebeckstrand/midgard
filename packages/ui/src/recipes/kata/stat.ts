import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi

const label = [...text.muted, weight.medium, size.sm]

const value = defineRecipe({
	base: [weight.semibold, 'tracking-tight tabular-nums', ...text.default],
	size: {
		sm: size['2xl'],
		md: size['3xl'],
		lg: size['4xl'],
	},
	defaults: { size: 'md' },
})

const delta = defineRecipe({
	base: [flex.inline, size.sm, 'gap-1', weight.medium, 'tabular-nums'],
	trend: {
		up: text.success,
		down: text.error,
		neutral: text.muted,
	},
	defaults: { trend: 'neutral' },
})

export const k = defineRecipe(
	{
		base: [flex.col, 'justify-center', 'h-full', 'gap-1'],
		slots: {
			description: [size.sm, ...text.muted],
		},
		skeleton: kokkaku.stat,
	},
	{
		label,
		value,
		delta,
	},
)

/** Recipe variant props for {@link StatValue} — its styling axes (`size`), for consumers composing custom slots. */
export type StatValueVariants = VariantProps<typeof value>
/** Recipe variant props for {@link StatDelta} — its styling axes (`trend`), for consumers composing custom slots. */
export type StatDeltaVariants = VariantProps<typeof delta>
