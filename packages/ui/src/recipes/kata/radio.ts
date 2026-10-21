import { defineScale, type ScaleStep } from '../../core/density'
import { defineColors, defineKata, type VariantProps } from '../../core/recipe'
import { dan, kasane, kokkaku } from '../kiso'
import { check } from '../kumi/check'

const { rounded } = kasane
const { radio } = kokkaku

export const k = defineKata(
	{
		extends: check,
		slots: {
			base: {
				base: [
					rounded.full,
					'[--check-border:transparent]',
					'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
					'not-has-disabled:has-checked:hover:opacity-90',
					// The circle takes the step of the nearest density scope.
					radio.circle,
				],
				color: defineColors({
					zinc: {
						light:
							'[--check-bg:var(--color-zinc-900)] [--check-border:var(--color-zinc-950)]/90 [--check-mark:var(--color-white)]',
						dark: 'dark:[--check-bg:var(--color-zinc-500)] dark:[--check-border:var(--color-zinc-500)]/90',
					},
				}),
			},
			/**
			 * The dot: the sibling that follows the native input. It shows when the
			 * input is checked, and it takes the step of the nearest density scope. Each
			 * class selects the dot itself, so Chromium tests the rules only against the
			 * dots.
			 */
			indicator: {
				base: [
					'absolute rounded-full bg-(--check-mark) opacity-0 pointer-events-none',
					'[:checked~&]:opacity-100',
					dan.size.radio.dot,
				],
			},
		},
	},
	{ skeleton: radio },
)

/** The size scale of {@link Radio}: the steps of its circle and dot. */
export const scale = defineScale(dan.size.check.box, dan.size.radio.dot)

/** Recipe variant props for {@link Radio}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type RadioVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the circle when it is checked. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
