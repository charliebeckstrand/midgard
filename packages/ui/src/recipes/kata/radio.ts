import { defineScale, type ScaleStep } from '../../core/density'
import { defineColors, defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'

const { rounded } = kasane
const { radio } = kokkaku

const color = defineColors({
	zinc: {
		light:
			'[--check-bg:var(--color-zinc-900)] [--check-border:var(--color-zinc-950)]/90 [--check-mark:var(--color-white)]',
		dark: 'dark:[--check-bg:var(--color-zinc-500)] dark:[--check-border:var(--color-zinc-500)]/90',
	},
	...control.check.color,
})

export const k = bridge.check(
	control,
	{
		base: [
			rounded.full,
			'[--check-border:transparent]',
			'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
			// The circle takes the step of the nearest density scope.
			kokkaku.radio.circle,
		],
		color,
		skeleton: radio,
	},
	{
		/**
		 * The dot: the sibling that follows the native input. It shows when the
		 * input is checked, and it takes the step of the nearest density scope. Each
		 * class selects the dot itself, so Chromium tests the rules only against the
		 * dots.
		 */
		indicator: defineRecipe({
			base: [
				'absolute rounded-full bg-(--check-mark) opacity-0 pointer-events-none',
				'[:checked~&]:opacity-100',
				dan.size.radioDot,
			],
		}),
	},
)

/** The size scale of {@link Radio}: the steps of its circle and dot. */
export const scale = defineScale(dan.size.checkBox, dan.size.radioDot)

/** Recipe variant props for {@link Radio}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type RadioVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the circle when it is checked. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
